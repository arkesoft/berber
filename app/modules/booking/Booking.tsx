import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import * as s from "../../contracts/schemas";
import {
  request,
  setGuestToken,
  ApiError,
  mockMode,
} from "../../shared/api/http";
import { Button, Field, Notice, QueryState } from "../../shared/ui";
import {
  formatMoney,
  formatTime,
  formatDate,
  addDays,
} from "../../shared/format";
import { t } from "../../shared/i18n";
import { PageIntro } from "../../shared/PageIntro";
import { SlotPicker } from "../../shared/SlotPicker";
import { landingPhotos } from "../../config/landing";
import { useSession } from "../identity";
import { useAvailability, useCatalog } from "./api";
const contactSchema = s.customer.extend({
  privacyAccepted: z.literal(true, {
    error: t("copy.ff4eda19a5"),
  }),
});
type Contact = z.infer<typeof contactSchema>;
const steps = [
  t("copy.b3202c47f7"),
  t("copy.a48c81f454"),
  t("copy.c17048e6ca"),
  "Bilgileriniz",
  t("copy.5f0d2488e2"),
];
export function BookingPage() {
  const query = useCatalog(),
    auth = useSession(),
    cache = useQueryClient(),
    [params] = useSearchParams();
  const [step, setStep] = useState(0),
    [serviceId, setServiceId] = useState(params.get("hizmet") ?? ""),
    [staffId, setStaffId] = useState(""),
    [date, setDate] = useState(""),
    [slotId, setSlotId] = useState(""),
    [contact, setContact] = useState<Contact | null>(null),
    [reservation, setReservation] = useState<s.Reservation | null>(null),
    [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    createKey = useRef<string>(""),
    paymentKey = useRef<string>("");
  const selectedDate = date || query.data?.today || "";
  const times = useAvailability(serviceId, staffId, selectedDate);
  const selectedService = query.data?.services.find((x) => x.id === serviceId),
    selectedStaff = query.data?.staff.find((x) => x.id === staffId),
    selectedSlot = times.data?.slots.find((x) => x.id === slotId);
  useEffect(() => {
    heading.current?.focus();
  }, [step, done]);
  const create = useMutation({
    mutationFn: () => {
      if (!contact || !slotId || !serviceId || !staffId)
        throw new Error(t("copy.4ed92ca329"));
      createKey.current ||= crypto.randomUUID();
      return request("/reservations", s.createdReservation, {
        method: "POST",
        body: {
          serviceId,
          staffId,
          slotId,
          customer: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
          },
          privacyAccepted: contact.privacyAccepted,
        },
        key: createKey.current,
      });
    },
    onSuccess: (result) => {
      setReservation(result.reservation);
      setGuestToken(result.guestToken);
      if (result.reservation.status === "confirmed") setDone(true);
      void cache.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "SLOT_CONFLICT") {
        setStep(2);
        setSlotId("");
        createKey.current = "";
        void times.refetch();
      }
    },
  });
  const pay = useMutation({
    mutationFn: () => {
      paymentKey.current ||= crypto.randomUUID();
      return request("/payments", s.paymentResult, {
        method: "POST",
        body: { reservationId: reservation?.id },
        key: paymentKey.current,
      });
    },
    onSuccess: (result) => {
      if (result.mode !== "mock") throw new Error(t("copy.2d1e824b05"));
      setReservation(result.reservation);
      setDone(true);
      void cache.invalidateQueries({ queryKey: ["reservations"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "PAYMENT_FAILED")
        paymentKey.current = "";
    },
  });
  function backTo(index: number) {
    setStep(index);
    create.reset();
    createKey.current = "";
  }
  if (done && reservation)
    return (
      <section className="confirmation">
        <span className="confirmation-mark" aria-hidden="true">
          ✓
        </span>
        <h1 tabIndex={-1} ref={heading}>
          {t("copy.3a471a2c70")}
        </h1>
        <p>{t(mockMode ? "copy.f4b2645a5b" : "booking.liveConfirmed")}</p>
        <div className="receipt">
          <h2>{reservation.serviceName}</h2>
          <p>{reservation.staffName}</p>
          <p>
            {formatDate(reservation.startsAt)} ·{" "}
            {formatTime(reservation.startsAt)}
          </p>
          <dl>
            <dt>{t("copy.86e8f7f954")}</dt>
            <dd>{formatMoney(reservation.total)}</dd>
            <dt>{t(mockMode ? "copy.6313c23e9e" : "booking.liveDeposit")}</dt>
            <dd>{formatMoney(reservation.deposit)}</dd>
            <dt>{t("copy.5123083a6d")}</dt>
            <dd>{reservation.id}</dd>
          </dl>
        </div>
        {auth.data?.user?.role === "customer" && (
          <Link className="button primary" to="/randevularim">
            {t("copy.2a289bd91d")}
          </Link>
        )}
        <Link to="/">{t("copy.6d685d12cb")}</Link>
      </section>
    );
  return (
    <section className="booking-page">
      <PageIntro
        title={t("booking.title")}
        description={t("booking.subtitle")}
        image={landingPhotos.cut}
      >
        <span className="journey-progress">
          {step + 1} / {steps.length}
        </span>
      </PageIntro>
      <ol className="booking-steps" aria-label={t("copy.edcef80fa6")}>
        {steps.map((label, i) => (
          <li
            key={label}
            data-complete={i < step}
            aria-current={step === i ? "step" : undefined}
          >
            <span className="step-dot" aria-hidden="true">
              {i < step ? "✓" : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <div className="booking-layout">
          <div className="booking-content">
            <h2 tabIndex={-1} ref={heading}>
              {steps[step]}
            </h2>
            {create.error && <Notice error>{create.error.message}</Notice>}
            {step === 0 && (
              <>
                <fieldset className="choices">
                  <legend className="sr-only">{t("copy.fd6c4b13bb")}</legend>
                  {query.data?.services.map((service) => (
                    <label
                      key={service.id}
                      className={`choice choice-service ${serviceId === service.id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="service"
                        value={service.id}
                        checked={serviceId === service.id}
                        onChange={() => {
                          setServiceId(service.id);
                          setStaffId("");
                          setSlotId("");
                        }}
                      />
                      <span>
                        <strong>{service.name}</strong>
                        <span className="muted">{service.description}</span>
                        <span>
                          {service.durationMinutes}
                          {t("copy.d8217002fd")}
                        </span>
                      </span>
                      <strong>{formatMoney(service.price)}</strong>
                    </label>
                  ))}
                </fieldset>
                {query.data?.services.length === 0 && (
                  <Notice>{t("copy.cd081228b3")}</Notice>
                )}
                <Button disabled={!selectedService} onClick={() => setStep(1)}>
                  {t("copy.37d87d9c4a")}
                </Button>
              </>
            )}
            {step === 1 && (
              <>
                <fieldset className="choices">
                  <legend className="sr-only">{t("copy.eb7c34919a")}</legend>
                  {query.data?.staff
                    .filter((person) => person.serviceIds.includes(serviceId))
                    .map((person) => (
                      <label
                        key={person.id}
                        className={`choice ${staffId === person.id ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="staff"
                          checked={staffId === person.id}
                          onChange={() => {
                            setStaffId(person.id);
                            setSlotId("");
                          }}
                        />
                        <span className="initial" aria-hidden="true">
                          {person.name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")}
                        </span>
                        <span>
                          <strong>{person.name}</strong>
                          <span className="muted">{person.title}</span>
                        </span>
                      </label>
                    ))}
                </fieldset>
                <div className="actions">
                  <Button variant="secondary" onClick={() => backTo(0)}>
                    {t("copy.b68a3150ea")}
                  </Button>
                  <Button disabled={!selectedStaff} onClick={() => setStep(2)}>
                    {t("copy.45bda27649")}
                  </Button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Field
                  label={t("copy.c49b451d56")}
                  type="date"
                  name="date"
                  value={selectedDate}
                  min={query.data?.today}
                  max={
                    query.data
                      ? addDays(
                          query.data.today,
                          query.data.salon.bookingDays - 1,
                        )
                      : undefined
                  }
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlotId("");
                  }}
                />
                <p className="muted">
                  {t("copy.4b15c1caa6")}
                  {query.data?.salon.timezone}
                  {t("copy.46b3ffb930")}
                </p>
                <QueryState
                  pending={times.isPending}
                  error={times.error}
                  retry={() => void times.refetch()}
                >
                  {times.data && (
                    <SlotPicker
                      data={times.data}
                      name="slot"
                      value={slotId}
                      onChange={setSlotId}
                      legend={t("copy.c076b802b6")}
                    />
                  )}
                </QueryState>
                <div className="actions">
                  <Button variant="secondary" onClick={() => backTo(1)}>
                    {t("copy.b68a3150ea")}
                  </Button>
                  <Button
                    disabled={
                      !selectedSlot || times.isFetching || times.isError
                    }
                    onClick={() => setStep(3)}
                  >
                    {t("copy.f6420582fd")}
                  </Button>
                </div>
              </>
            )}
            {step === 3 && (
              <ContactForm
                initial={contact}
                onBack={() => backTo(2)}
                onSubmit={(values) => {
                  setContact(values);
                  setStep(4);
                }}
              />
            )}
            {step === 4 && (
              <div className="stack">
                <p>
                  {contact?.name}
                  {t(mockMode ? "copy.c5a7b7b64d" : "booking.liveSelection")}
                </p>
                <Notice>
                  {t(mockMode ? "copy.4691ec0cb1" : "booking.liveReview")}
                </Notice>
                {(selectedService?.deposit.amount ?? 0) === 0 && (
                  <Notice>{t("paymentPolicy.noDeposit")}</Notice>
                )}
                {query.data?.paymentSettings?.onlinePaymentVisible && (
                  <section aria-label={t("paymentPolicy.publicTitle")}>
                    <h3>{t("paymentPolicy.publicTitle")}</h3>
                    {!mockMode && (
                      <Notice>{t("paymentPolicy.publicOffline")}</Notice>
                    )}
                  </section>
                )}
                {!mockMode && (selectedService?.deposit.amount ?? 0) > 0 && (
                  <Notice>{t("booking.paymentDisabled")}</Notice>
                )}
                {pay.error && <Notice error>{pay.error.message}</Notice>}
                {!reservation ? (
                  <>
                    <Button
                      disabled={
                        create.isPending ||
                        (!selectedSlot && !createKey.current) ||
                        !auth.data
                      }
                      onClick={() => create.mutate()}
                    >
                      {create.isPending
                        ? t("copy.8148c1b67b")
                        : t("copy.f16c2a8a9d")}
                    </Button>
                    <Button variant="secondary" onClick={() => backTo(3)}>
                      {t("copy.5489db9441")}
                    </Button>
                  </>
                ) : (
                  <>
                    <p>
                      {t("copy.6be3cc1366")}
                      {reservation.id}
                      {t("copy.59f6a9776e")}{" "}
                      <strong>{formatMoney(reservation.deposit)}</strong>
                    </p>
                    {mockMode &&
                      query.data?.paymentSettings?.onlinePaymentVisible !==
                        false && (
                        <Button
                          disabled={pay.isPending || !mockMode}
                          onClick={() => pay.mutate()}
                        >
                          {pay.isPending
                            ? t("copy.01a73aedab")
                            : t("copy.23e80c5ad5")}
                        </Button>
                      )}
                    {pay.error instanceof ApiError &&
                      pay.error.code === "HOLD_EXPIRED" && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setReservation(null);
                            setSlotId("");
                            setStep(2);
                            createKey.current = "";
                            paymentKey.current = "";
                            pay.reset();
                            void times.refetch();
                          }}
                        >
                          {t("copy.78d2dcb0a1")}
                        </Button>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
          <aside className="booking-summary" aria-labelledby="summary-title">
            <p className="muted">{t("copy.21e2f0d17b")}</p>
            <h2 id="summary-title">{t("copy.a8287f2ecf")}</h2>
            <dl>
              <dt>{t("copy.b3202c47f7")}</dt>
              <dd>{selectedService?.name ?? t("copy.64527440a4")}</dd>
              <dt>{t("copy.a48c81f454")}</dt>
              <dd>{selectedStaff?.name ?? t("copy.64527440a4")}</dd>
              <dt>{t("copy.fbfceccd03")}</dt>
              <dd>
                {selectedService
                  ? `${selectedService.durationMinutes} dakika`
                  : "—"}
              </dd>
              <dt>{t("copy.6ff8021ebc")}</dt>
              <dd>{selectedDate ? formatDate(selectedDate) : "—"}</dd>
              <dt>{t("copy.6bc5a901db")}</dt>
              <dd>
                {reservation
                  ? formatTime(reservation.startsAt)
                  : selectedSlot
                    ? formatTime(selectedSlot.startsAt)
                    : t("copy.64527440a4")}
              </dd>
            </dl>
            {selectedService && (
              <div className="summary-total">
                <span>{t("copy.86e8f7f954")}</span>
                <strong>{formatMoney(selectedService.price)}</strong>
                <span>{t("copy.bc003b71c9")}</span>
                <span>{formatMoney(selectedService.deposit)}</span>
              </div>
            )}
            <p className="muted">{t("copy.68611bce87")}</p>
          </aside>
        </div>
      </QueryState>
    </section>
  );
}
function ContactForm({
  initial,
  onSubmit,
  onBack,
}: {
  initial: Contact | null;
  onSubmit: (values: Contact) => void;
  onBack: () => void;
}) {
  const form = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: initial ?? undefined,
  });
  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="stack">
      <Field
        label={t("copy.ad0fcbcc79")}
        autoComplete="name"
        {...form.register("name")}
        error={form.formState.errors.name?.message}
      />
      <Field
        label={t("copy.e1081b69d8")}
        type="email"
        autoComplete="email"
        {...form.register("email")}
        error={form.formState.errors.email?.message}
      />
      <Field
        label={t("copy.fa6906d76e")}
        type="tel"
        autoComplete="tel"
        {...form.register("phone")}
        error={form.formState.errors.phone?.message}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          {...form.register("privacyAccepted")}
          aria-describedby="privacy-note"
        />
        {t("copy.ee43663bc7")}
      </label>
      <p id="privacy-note" className="muted">
        {t("copy.01ed676eb6")}
      </p>
      {form.formState.errors.privacyAccepted && (
        <Notice error>{form.formState.errors.privacyAccepted.message}</Notice>
      )}
      <div className="actions">
        <Button variant="secondary" type="button" onClick={onBack}>
          {t("copy.b68a3150ea")}
        </Button>
        <Button type="submit">{t("copy.7f962d5727")}</Button>
      </div>
    </form>
  );
}

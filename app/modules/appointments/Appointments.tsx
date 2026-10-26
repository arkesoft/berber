import { useState } from "react";
import { RequestIntent } from "../../shared/api/intent";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as s from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import { Button, Confirm, Field, Notice, QueryState } from "../../shared/ui";
import {
  formatDate,
  formatMoney,
  formatTime,
  addDays,
} from "../../shared/format";
import { t } from "../../shared/i18n";
import { PageIntro } from "../../shared/PageIntro";
import { landingPhotos } from "../../config/landing";
import { Access } from "../identity";
import { useAvailability, useCatalog } from "../booking";
export function AppointmentsPage() {
  return (
    <Access roles={["customer"]}>
      <CustomerAppointments />
    </Access>
  );
}
function CustomerAppointments() {
  const [filter, setFilter] = useState("upcoming"),
    [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["reservations", page],
    queryFn: ({ signal }) =>
      request(`/reservations?page=${page}&pageSize=20`, s.page, { signal }),
  });
  const rows =
    query.data?.items.filter((r) =>
      filter === "upcoming"
        ? ["confirmed", "pending_payment", "in_service"].includes(r.status)
        : !["confirmed", "pending_payment", "in_service"].includes(r.status),
    ) ?? [];
  return (
    <section>
      <PageIntro
        title={t("copy.fe1e63ffb9")}
        description={t("copy.f1874e6f21")}
        image={landingPhotos.chair}
      >
        <Link className="button primary" to="/randevu">
          {t("copy.0d17dc0308")}
        </Link>
      </PageIntro>
      <div className="tabs">
        <Button
          variant="quiet"
          aria-pressed={filter === "upcoming"}
          onClick={() => setFilter("upcoming")}
        >
          {t("copy.b1db604980")}
        </Button>
        <Button
          variant="quiet"
          aria-pressed={filter === "past"}
          onClick={() => setFilter("past")}
        >
          {t("copy.207848e015")}
        </Button>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <AppointmentRows rows={rows} role="customer" />
        {query.data && query.data.total > 20 && (
          <div className="actions">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
              {t("copy.b74566b03e")}
            </Button>
            <span>
              {t("copy.ed00c31245")}
              {page} · {query.data.total}
              {t("copy.31830ba6bc")}
            </span>
            <Button
              disabled={page * 20 >= query.data.total}
              onClick={() => setPage(page + 1)}
            >
              {t("copy.4c68362c33")}
            </Button>
          </div>
        )}
      </QueryState>
    </section>
  );
}
export function AppointmentRows({
  rows,
  role,
}: {
  rows: s.Reservation[];
  role: s.Role;
}) {
  return rows.length ? (
    <div className="appointments-list">
      {rows.map((r) => (
        <AppointmentRow key={r.id} reservation={r} role={role} />
      ))}
    </div>
  ) : (
    <Notice>{t("copy.7e57176533")}</Notice>
  );
}
function AppointmentRow({
  reservation: r,
  role,
}: {
  reservation: s.Reservation;
  role: s.Role;
}) {
  const [rescheduling, setRescheduling] = useState(false),
    cache = useQueryClient();
  const [intent] = useState(() => new RequestIntent());
  const mutation = useMutation({
    mutationFn: ({
      action,
      slotId,
    }: {
      action: s.Reservation["allowedActions"][number];
      slotId?: string;
    }) =>
      request(`/reservations/${r.id}`, s.reservation, {
        method: "PATCH",
        key: intent.keyFor({ version: r.version, action, slotId }),
        body: { version: r.version, action, slotId },
      }),
    onSuccess: async () => {
      intent.complete();
      setRescheduling(false);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["reservations"] }),
        cache.invalidateQueries({ queryKey: ["operations"] }),
        cache.invalidateQueries({ queryKey: ["availability"] }),
      ]);
    },
  });
  const actions = r.allowedActions.filter((action) =>
    role === "customer"
      ? ["cancel", "reschedule"].includes(action)
      : role === "staff"
        ? ["start", "complete", "no_show"].includes(action)
        : true,
  );
  return (
    <article className="appointment-row">
      <div className="appointment-time">
        <strong>{formatTime(r.startsAt)}</strong>
        <span className="muted">{formatDate(r.startsAt)}</span>
      </div>
      <div className="appointment-detail">
        <h2>{r.serviceName}</h2>
        <p>
          {role === "customer"
            ? r.staffName
            : `${r.customer.name} · ${r.staffName}`}
        </p>
        <span className={`status status-${r.status}`}>
          {t(`status.${r.status}`)}
        </span>
        <span className="muted">
          {formatMoney(r.total)} · {t(`payment.${r.paymentStatus}`)}
        </span>
      </div>
      <div className="row-actions">
        {actions.includes("reschedule") && (
          <Button
            variant="quiet"
            disabled={mutation.isPending}
            onClick={() => setRescheduling(!rescheduling)}
          >
            {t("copy.b08559ac71")}
          </Button>
        )}
        {actions.includes("cancel") && (
          <Confirm
            label={t("copy.a73d420f52")}
            description={t("copy.d31414963b", {
              value0: formatDate(r.startsAt),
              value1: formatTime(r.startsAt),
            })}
            onConfirm={() => mutation.mutate({ action: "cancel" })}
          />
        )}
        {actions.includes("start") && (
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ action: "start" })}
          >
            {t("copy.425f012473")}
          </Button>
        )}
        {actions.includes("complete") && (
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ action: "complete" })}
          >
            {t("copy.978c619ffe")}
          </Button>
        )}
        {actions.includes("no_show") && (
          <Button
            variant="quiet"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ action: "no_show" })}
          >
            {t("copy.0dd4afe767")}
          </Button>
        )}
        <details>
          <summary>{t("copy.5727060279")}</summary>
          <p>
            {t("copy.6be3cc1366")}
            {r.id}
          </p>
          <p>
            {t("copy.91b0a60019")}
            {formatMoney(r.deposit)}
          </p>
          <p>
            {t("copy.97157ad032")}
            {formatTime(r.endsAt)}
          </p>
          <p>{r.customer.name}</p>
        </details>
      </div>
      {mutation.error && (
        <Notice error>
          {mutation.error.message}
          <Button
            variant="quiet"
            onClick={() => {
              void cache.invalidateQueries({ queryKey: ["reservations"] });
              void cache.invalidateQueries({ queryKey: ["operations"] });
            }}
          >
            {t("copy.0fc6e47a5f")}
          </Button>
        </Notice>
      )}
      {rescheduling && (
        <Reschedule
          reservation={r}
          pending={mutation.isPending}
          onSubmit={(slotId) =>
            mutation.mutate({ action: "reschedule", slotId })
          }
        />
      )}
    </article>
  );
}
function Reschedule({
  reservation: r,
  onSubmit,
  pending,
}: {
  reservation: s.Reservation;
  onSubmit: (id: string) => void;
  pending: boolean;
}) {
  const catalog = useCatalog(),
    [date, setDate] = useState(r.startsAt.slice(0, 10)),
    [slotId, setSlot] = useState("");
  const query = useAvailability(r.serviceId, r.staffId, date);
  return (
    <div className="reschedule">
      <Field
        label={t("copy.82f887c132")}
        name={`date-${r.id}`}
        type="date"
        value={date}
        min={catalog.data?.today}
        max={
          catalog.data
            ? addDays(catalog.data.today, catalog.data.salon.bookingDays - 1)
            : undefined
        }
        onChange={(e) => {
          setDate(e.target.value);
          setSlot("");
        }}
      />
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <fieldset className="slot-grid">
          <legend>{t("copy.e7f38d38f3")}</legend>
          {query.data?.slots.map((slot) => (
            <label className="slot" key={slot.id}>
              <input
                type="radio"
                name={`reschedule-${r.id}`}
                checked={slotId === slot.id}
                onChange={() => setSlot(slot.id)}
              />
              {formatTime(slot.startsAt)}
            </label>
          ))}
        </fieldset>
        {query.data?.slots.length === 0 && <p>{t("copy.880588123b")}</p>}
      </QueryState>
      <Button
        disabled={pending || !query.data?.slots.some((x) => x.id === slotId)}
        onClick={() => onSubmit(slotId)}
      >
        {t("copy.359e38a751")}
      </Button>
    </div>
  );
}

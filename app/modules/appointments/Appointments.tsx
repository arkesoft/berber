import { useEffect, useState } from "react";
import { RequestIntent } from "../../shared/api/intent";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as s from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import {
  Button,
  Confirm,
  Field,
  Notice,
  QueryState,
  Modal,
} from "../../shared/ui";
import { Pagination } from "../../shared/Pagination";
import { SlotPicker } from "../../shared/SlotPicker";
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
import { CollectionButton, CollectionSummary } from "../payments";
import { useAvailability, useCatalog } from "../booking";
export function AppointmentsPage() {
  return (
    <Access roles={["customer"]}>
      <CustomerAppointments />
    </Access>
  );
}
function CustomerAppointments() {
  const [params, setParams] = useSearchParams();
  const filter = params.get("period") === "past" ? "past" : "upcoming";
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const pageSize = [10, 20, 50].includes(Number(params.get("size")))
    ? Number(params.get("size"))
    : 10;
  function change(values: Record<string, string | number>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(values))
        next.set(key, String(value));
      return next;
    });
  }
  const query = useQuery({
    queryKey: ["reservations", filter, page, pageSize],
    queryFn: ({ signal }) =>
      request(
        `/reservations?period=${filter}&page=${page}&pageSize=${pageSize}`,
        s.page,
        { signal },
      ),
  });
  const rows = query.data?.items ?? [];
  useEffect(() => {
    if (!query.data) return;
    const last = Math.max(1, Math.ceil(query.data.total / pageSize));
    if (page > last)
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("page", String(last));
          return next;
        },
        { replace: true },
      );
  }, [page, pageSize, query.data, setParams]);
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
          onClick={() => change({ period: "upcoming", page: 1 })}
        >
          {t("copy.b1db604980")}
        </Button>
        <Button
          variant="quiet"
          aria-pressed={filter === "past"}
          onClick={() => change({ period: "past", page: 1 })}
        >
          {t("copy.207848e015")}
        </Button>
      </div>
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        <AppointmentRows rows={rows} role="customer" paginate={false} />
        {query.data && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={query.data.total}
            onPage={(page) => change({ page })}
            onPageSize={(size) => change({ size, page: 1 })}
          />
        )}
      </QueryState>
    </section>
  );
}
export function AppointmentRows({
  rows,
  role,
  paginate = true,
}: {
  rows: s.Reservation[];
  role: s.Role;
  paginate?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(rows.length / pageSize)),
  );
  const shown = paginate
    ? rows.slice((current - 1) * pageSize, current * pageSize)
    : rows;
  return rows.length ? (
    <>
      <div className="appointments-list">
        {shown.map((r) => (
          <AppointmentRow key={r.id} reservation={r} role={role} />
        ))}
      </div>
      {paginate && (
        <Pagination
          page={current}
          pageSize={pageSize}
          total={rows.length}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </>
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
  const [details, setDetails] = useState(false);
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
        <CollectionSummary reservation={r} />
      </div>
      <div className="row-actions">
        {role === "manager" && <CollectionButton reservation={r} />}
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
            disabled={mutation.isPending}
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
          <Confirm
            disabled={mutation.isPending}
            label={t("copy.978c619ffe")}
            description={t("panel.confirmComplete")}
            confirmLabel={t("panel.confirm")}
            onConfirm={() => mutation.mutate({ action: "complete" })}
          />
        )}
        {actions.includes("no_show") && (
          <Confirm
            disabled={mutation.isPending}
            label={t("copy.0dd4afe767")}
            description={t("panel.confirmNoShow")}
            confirmLabel={t("panel.confirm")}
            onConfirm={() => mutation.mutate({ action: "no_show" })}
          />
        )}
        <Button variant="quiet" onClick={() => setDetails(true)}>
          {t("copy.5727060279")}
        </Button>
        {details && (
          <Modal title={t("panel.details")} onClose={() => setDetails(false)}>
            <p>
              <strong>{r.serviceName}</strong> · {r.staffName}
            </p>
            <p>
              {formatDate(r.startsAt)} · {formatTime(r.startsAt)}–
              {formatTime(r.endsAt)}
            </p>
            <p>
              {t(`status.${r.status}`)} · {formatMoney(r.total)}
            </p>
            {r.chairName && (
              <p>
                {t("panel.chair")}: {r.chairName}
              </p>
            )}
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
          </Modal>
        )}
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
        <Modal
          title={t("panel.reschedule")}
          onClose={() => setRescheduling(false)}
          busy={mutation.isPending}
        >
          <p>
            {r.serviceName} · {r.staffName}
          </p>
          {mutation.error && <Notice error>{mutation.error.message}</Notice>}
          <Reschedule
            reservation={r}
            pending={mutation.isPending}
            onSubmit={(slotId) =>
              mutation.mutate({ action: "reschedule", slotId })
            }
          />
        </Modal>
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
        {query.data && (
          <SlotPicker
            data={query.data}
            name={`reschedule-${r.id}`}
            value={slotId}
            onChange={setSlot}
            legend={t("copy.e7f38d38f3")}
          />
        )}
      </QueryState>
      <Button
        disabled={
          pending ||
          query.isFetching ||
          query.isError ||
          !query.data?.slots.some((x) => x.id === slotId)
        }
        onClick={() => onSubmit(slotId)}
      >
        {t("copy.359e38a751")}
      </Button>
    </div>
  );
}

import { useState } from "react";
import { Link, NavLink, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  operations,
  type Operations,
  type Role,
} from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import { Button, Field, Notice, QueryState } from "../../shared/ui";
import {
  addDays,
  formatDate,
  formatMoney,
  localDay,
} from "../../shared/format";
import { PagedList } from "../../shared/PagedList";
import { t } from "../../shared/i18n";
import { Access } from "../identity";
import { AppointmentRows } from "../appointments";
import { useCatalog } from "../booking";
import { Management } from "./Management";
import { PaymentSettings } from "./PaymentSettings";
import {
  CollectionButton,
  CollectionSummary,
  collectionStatus,
  receivedAmount,
} from "../payments";
const managerNav = [
  ["", t("copy.4f72a8f34f")],
  ["takvim", t("copy.d67eeb1cfc")],
  ["hizmetler", t("copy.fdfb6e5fa2")],
  ["calisanlar", t("copy.b9138717ff")],
  ["koltuklar", "Koltuklar"],
  ["mesai", t("copy.6a4046b48b")],
  ["musteriler", t("copy.c705135d51")],
  ["odemeler", t("copy.813c5cc8a4")],
  ["odeme-ayarlari", t("paymentSettings.title")],
  ["raporlar", t("copy.bc46f26e25")],
  ["ayarlar", t("copy.397ee7610b")],
];
export function ManagerPage() {
  return (
    <Access roles={["manager"]}>
      <OperationsPage role="manager" />
    </Access>
  );
}
export function StaffPage() {
  return (
    <Access roles={["staff"]}>
      <OperationsPage role="staff" />
    </Access>
  );
}
function OperationsPage({ role }: { role: Role }) {
  const { section = "" } = useParams(),
    catalog = useCatalog();
  const query = useQuery({
    queryKey: ["operations", role],
    queryFn: ({ signal }) => request("/operations", operations, { signal }),
  });
  const nav =
    role === "manager"
      ? managerNav
      : [
          ["", t("copy.60fb851ebe")],
          ["takvim", t("copy.fe1e63ffb9")],
          ["mesai", t("copy.c34c0409b4")],
        ];
  const title = nav.find(([path]) => path === section)?.[1];
  const [date, setDate] = useState(""),
    [weekly, setWeekly] = useState(false),
    [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState("");
  const day = date || catalog.data?.today || localDay(new Date().toISOString()),
    prefix = role === "manager" ? "/yonetim" : "/calisan";
  if (!title)
    return (
      <section className="system-page">
        <h1 tabIndex={-1}>{t("copy.54862c4b8a")}</h1>
        <Link className="button primary" to={prefix}>
          {t("copy.c331d84087")}
        </Link>
      </section>
    );
  return (
    <div className="operations-layout">
      <aside className="operations-nav" data-open={menuOpen}>
        <div className="mobile-nav-toggle">
          <Button
            variant="secondary"
            aria-expanded={menuOpen}
            aria-controls="operations-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {role === "manager" ? t("copy.5659ca5a38") : t("nav.staffMenu")}
          </Button>
        </div>
        <nav
          id="operations-menu"
          aria-label={
            role === "manager" ? t("copy.8c99e02d7a") : t("copy.bcb61edc3a")
          }
        >
          {nav.map(([path, label]) => (
            <NavLink
              key={path}
              end
              to={`${prefix}${path ? `/${path}` : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="operations-content">
        <div className="page-heading">
          <div>
            <h1 tabIndex={-1}>{title}</h1>
            <p className="muted">
              {query.data?.salon.name} ·{" "}
              {role === "manager" ? t("copy.8c99e02d7a") : t("copy.8c4a47b72b")}
            </p>
          </div>
          {role === "manager" && ["", "takvim"].includes(section) && (
            <Link className="button primary" to="/randevu">
              {t("copy.3aee248918")}
            </Link>
          )}
        </div>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        >
          {query.data && (
            <>
              {["", "takvim"].includes(section) && (
                <>
                  <div className="filter-row">
                    <Field
                      label={t("copy.c2715f864e")}
                      name="plan-date"
                      type="date"
                      value={day}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      aria-pressed={weekly}
                      onClick={() => setWeekly(!weekly)}
                    >
                      {weekly ? t("copy.6cc0121569") : t("copy.433a25497a")}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => setDate(addDays(day, -1))}
                    >
                      {t("panel.previousDay")}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setDate(
                          catalog.data?.today ??
                            localDay(new Date().toISOString()),
                        )
                      }
                    >
                      {t("panel.today")}
                    </Button>
                    <Button
                      variant="quiet"
                      onClick={() => setDate(addDays(day, 1))}
                    >
                      {t("panel.nextDay")}
                    </Button>
                  </div>
                  <div className="filter-row">
                    <Field
                      label={t("panel.search")}
                      name="appointment-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {role === "manager" && (
                      <div className="field">
                        <label htmlFor="plan-staff">{t("panel.staff")}</label>
                        <select
                          id="plan-staff"
                          value={staffId}
                          onChange={(e) => setStaffId(e.target.value)}
                        >
                          <option value="">{t("panel.all")}</option>
                          {query.data.staff.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="field">
                      <label htmlFor="plan-status">{t("panel.status")}</label>
                      <select
                        id="plan-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">{t("panel.all")}</option>
                        {[
                          "confirmed",
                          "pending_payment",
                          "in_service",
                          "completed",
                          "cancelled",
                          "no_show",
                          "expired",
                        ].map((value) => (
                          <option key={value} value={value}>
                            {t(`status.${value}` as Parameters<typeof t>[0])}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(search || staffId || status) && (
                      <Button
                        variant="quiet"
                        onClick={() => {
                          setSearch("");
                          setStaffId("");
                          setStatus("");
                        }}
                      >
                        {t("panel.clear")}
                      </Button>
                    )}
                  </div>
                  {section === "" && <Summary data={query.data} day={day} />}
                  {Array.from({ length: weekly ? 7 : 1 }, (_, index) =>
                    addDays(day, index),
                  ).map((date) => (
                    <section className="day-plan" key={date}>
                      <h2>{formatDate(date)}</h2>
                      <AppointmentRows
                        key={`${date}-${search}-${staffId}-${status}`}
                        role={role}
                        rows={query.data!.reservations.filter(
                          (r) =>
                            localDay(r.startsAt, query.data!.salon.timezone) ===
                              date &&
                            (!staffId || r.staffId === staffId) &&
                            (!status || r.status === status) &&
                            `${r.customer.name} ${r.staffName} ${r.serviceName}`
                              .toLocaleLowerCase("tr")
                              .includes(search.trim().toLocaleLowerCase("tr")),
                        )}
                      />
                    </section>
                  ))}
                </>
              )}
              {section === "hizmetler" && (
                <Management
                  key="services"
                  resource="services"
                  data={query.data}
                />
              )}
              {section === "calisanlar" && (
                <Management key="staff" resource="staff" data={query.data} />
              )}
              {section === "koltuklar" && (
                <Management key="chairs" resource="chairs" data={query.data} />
              )}
              {section === "ayarlar" && (
                <Management key="salon" resource="salon" data={query.data} />
              )}
              {section === "mesai" &&
                (role === "manager" ? (
                  <Management
                    key="schedules"
                    resource="schedules"
                    data={query.data}
                  />
                ) : (
                  <PagedList
                    items={query.data.schedules}
                    searchText={(x) =>
                      `${x.date} ${x.note} ${formatDate(x.date)} ${x.kind === "shift" ? t("copy.e42274ad38") : x.kind === "break" ? t("copy.d0dd99fbac") : t("copy.a5fad871d8")}`
                    }
                    renderItem={(x) => (
                      <article className="resource-row" key={x.id}>
                        <div>
                          <h2>
                            {x.kind === "shift"
                              ? t("copy.e42274ad38")
                              : x.kind === "break"
                                ? t("copy.d0dd99fbac")
                                : t("copy.a5fad871d8")}
                          </h2>
                          <p>
                            {formatDate(x.date)} · {x.startsAt}–{x.endsAt}
                          </p>
                          <p>{x.note}</p>
                        </div>
                      </article>
                    )}
                  />
                ))}
              {section === "musteriler" && (
                <Management
                  key="customers"
                  resource="customers"
                  data={query.data}
                />
              )}
              {section === "odemeler" && <PaymentRecords data={query.data} />}
              {section === "odeme-ayarlari" && <PaymentSettings />}
              {section === "raporlar" && <Reports data={query.data} />}
            </>
          )}
        </QueryState>
      </section>
    </div>
  );
}
function Summary({ data, day }: { data: Operations; day: string }) {
  const rows = data.reservations.filter(
    (r) => localDay(r.startsAt, data.salon.timezone) === day,
  );
  return (
    <dl className="metrics">
      <div>
        <dt>{t("copy.e247a7e4d0")}</dt>
        <dd>{rows.length}</dd>
      </div>
      <div>
        <dt>{t("copy.f357b5b8fb")}</dt>
        <dd>{rows.filter((r) => r.status === "confirmed").length}</dd>
      </div>
      <div>
        <dt>{t("copy.af59eebce4")}</dt>
        <dd>{rows.filter((r) => r.status === "completed").length}</dd>
      </div>
    </dl>
  );
}
function PaymentRecords({ data }: { data: Operations }) {
  const [filter, setFilter] = useState("");
  return (
    <>
      <Notice>{t("collection.hint")}</Notice>
      <Link className="button secondary" to="/yonetim/odeme-ayarlari">
        {t("paymentSettings.title")}
      </Link>
      <div className="field">
        <label htmlFor="collection-filter">{t("panel.status")}</label>
        <select
          id="collection-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">{t("collection.all")}</option>
          {(["unpaid", "partial", "paid", "zero"] as const).map((value) => (
            <option key={value} value={value}>
              {t(`collection.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <PagedList
        key={filter}
        items={data.reservations.filter(
          (r) => !filter || collectionStatus(r) === filter,
        )}
        searchText={(r) =>
          `${r.customer.name} ${r.serviceName} ${t(`payment.${r.paymentStatus}`)}`
        }
        renderItem={(r) => (
          <article className="resource-row" key={r.id}>
            <div>
              <h2>{r.customer.name}</h2>
              <p>
                {r.id} · {formatDate(r.startsAt)}
              </p>
              <CollectionSummary reservation={r} />
            </div>
            <CollectionButton reservation={r} />
          </article>
        )}
      />
    </>
  );
}
function Reports({ data }: { data: Operations }) {
  const completed = data.reservations.filter((r) => r.status === "completed"),
    collected = data.reservations.reduce(
      (sum, r) => sum + receivedAmount(r),
      0,
    );
  return (
    <>
      <p className="muted">{t("copy.e0d864ac73")}</p>
      <dl className="metrics">
        <div>
          <dt>{t("copy.d5455fe33e")}</dt>
          <dd>{completed.length}</dd>
        </div>
        <div>
          <dt>{t("copy.1aaf4d069d")}</dt>
          <dd>
            {formatMoney({
              amount: completed.reduce((sum, r) => sum + r.total.amount, 0),
              currency: "TRY",
            })}
          </dd>
        </div>
        <div>
          <dt>{t("collection.netTotal")}</dt>
          <dd>{formatMoney({ amount: collected, currency: "TRY" })}</dd>
        </div>
      </dl>
      <h2>{t("copy.edb9631310")}</h2>
      <PagedList
        items={data.services}
        searchText={(service) => service.name}
        renderItem={(service) => (
          <div className="resource-row" key={service.id}>
            <span>{service.name}</span>
            <strong>
              {
                data.reservations.filter((r) => r.serviceId === service.id)
                  .length
              }{" "}
              {t("copy.7eb7b1f325")}
            </strong>
          </div>
        )}
      />
    </>
  );
}

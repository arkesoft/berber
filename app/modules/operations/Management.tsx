import { t } from "../../shared/i18n";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { RequestIntent } from "../../shared/api/intent";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as s from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import { Button, Field, Notice, Modal } from "../../shared/ui";
import { Pagination } from "../../shared/Pagination";
import { formatMoney, localDay } from "../../shared/format";
import { AppointmentRows } from "../appointments";
type Resource = s.ManagementChange["resource"];
type Item = s.ManagementChange["value"];
function amount(value: string | undefined) {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value ?? "");
  if (!match) return -1;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
export function Management({
  resource,
  data,
}: {
  resource: Resource;
  data: s.Operations;
}) {
  const [editing, setEditing] = useState<Item | null>(null),
    [saved, setSaved] = useState(false);
  const [related, setRelated] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const list: Item[] = resource === "salon" ? [data.salon] : data[resource];
  const filtered = list.filter((item) => {
    const person =
      "staffId" in item
        ? item.staffId
        : "assignedStaffId" in item
          ? item.assignedStaffId
          : undefined;
    const text = [
      "name" in item ? item.name : "",
      "email" in item ? `${item.email} ${item.phone}` : "",
      "note" in item ? item.note : "",
      data.staff.find((x) => x.id === person)?.name ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("tr");
    return (
      text.includes(search.trim().toLocaleLowerCase("tr")) &&
      (!status || ("active" in item && String(item.active) === status)) &&
      (!staffId || person === staffId || (staffId === "shared" && !person)) &&
      (!date || ("date" in item && item.date === date))
    );
  });
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / pageSize)),
  );
  const shown = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  function reset() {
    setSearch("");
    setStatus("");
    setStaffId("");
    setDate("");
    setPage(1);
  }
  function newItem(): Item {
    const id = crypto.randomUUID();
    if (resource === "services")
      return {
        id,
        name: "",
        description: "",
        durationMinutes: 30,
        price: { amount: 0, currency: "TRY" },
        deposit: { amount: 0, currency: "TRY" },
        active: true,
      };
    if (resource === "staff")
      return {
        id,
        name: "",
        title: "",
        serviceIds: [],
        active: true,
      };
    if (resource === "chairs")
      return { id, name: "", active: true, assignedStaffId: null };
    if (resource === "customers") return { id, name: "", email: "", phone: "" };
    return {
      id,
      staffId: data.staff[0]?.id ?? "",
      date: localDay(new Date().toISOString(), data.salon.timezone),
      kind: "shift",
      startsAt: "09:00",
      endsAt: "19:00",
      note: "",
    };
  }
  return (
    <div className="stack">
      {saved && <Notice>{t("panel.saved")}</Notice>}
      {resource !== "salon" && (
        <Button
          onClick={() => {
            setSaved(false);
            setEditing(newItem());
          }}
        >
          {t("copy.d37408eb0e")}
        </Button>
      )}
      {resource !== "salon" && (
        <div className="filter-row">
          <Field
            label={t("panel.search")}
            name="resource-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {["services", "staff", "chairs"].includes(resource) && (
            <div className="field">
              <label htmlFor="resource-status">{t("panel.status")}</label>
              <select
                id="resource-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("panel.all")}</option>
                <option value="true">{t("copy.d5f8845474")}</option>
                <option value="false">{t("copy.edd812578c")}</option>
              </select>
            </div>
          )}
          {["schedules", "chairs"].includes(resource) && (
            <div className="field">
              <label htmlFor="resource-staff">{t("panel.staff")}</label>
              <select
                id="resource-staff"
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("panel.all")}</option>
                {resource === "chairs" && (
                  <option value="shared">{t("panel.sharedChair")}</option>
                )}
                {data.staff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {resource === "schedules" && (
            <Field
              label={t("panel.date")}
              name="resource-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
          )}
          {(search || status || staffId || date) && (
            <Button variant="quiet" onClick={reset}>
              {t("panel.clear")}
            </Button>
          )}
        </div>
      )}
      {resource === "customers" && (
        <p className="muted">{t("panel.customerRecord")}</p>
      )}
      <div className="resource-list">
        {shown.map((item) => (
          <div className="resource-row" key={item.id}>
            <div>
              <strong>
                {"name" in item
                  ? item.name
                  : `${data.staff.find((x) => x.id === item.staffId)?.name} · ${item.date}`}
              </strong>
              <p className="muted">
                {"price" in item
                  ? `${formatMoney(item.price)} · ${item.durationMinutes} dk · Kapora ${formatMoney(item.deposit)}`
                  : "kind" in item
                    ? `${item.kind === "shift" ? t("copy.e42274ad38") : item.kind === "break" ? t("copy.d0dd99fbac") : t("copy.a5fad871d8")} · ${item.startsAt}–${item.endsAt} · ${item.note}`
                    : "title" in item
                      ? item.title
                      : "address" in item
                        ? item.address
                        : "email" in item
                          ? `${item.email} · ${item.phone}`
                          : ""}
              </p>
              {"active" in item && (
                <span>
                  {item.active ? t("copy.d5f8845474") : t("copy.edd812578c")}
                </span>
              )}
              {"serviceIds" in item && (
                <p className="muted">
                  {t("staff.servicesSummary", {
                    services:
                      data.services
                        .filter((service) =>
                          item.serviceIds.includes(service.id),
                        )
                        .map((service) => service.name)
                        .join(", ") || t("staff.noServices"),
                  })}
                </p>
              )}
              {resource === "chairs" && (
                <p>
                  {t("panel.assignedStaff")}:{" "}
                  {data.staff.find(
                    (x) =>
                      x.id ===
                      (item as s.Operations["chairs"][number]).assignedStaffId,
                  )?.name ?? t("panel.sharedChair")}
                </p>
              )}
              {resource === "salon" && (
                <p>
                  {t("slots.intervalSummary", {
                    minutes: data.salon.slotIntervalMinutes,
                  })}
                </p>
              )}
              {resource === "staff" && (
                <p className="muted">
                  {t("panel.chairsForStaff", {
                    names:
                      data.chairs
                        .filter(
                          (c) =>
                            c.active &&
                            (!c.assignedStaffId ||
                              c.assignedStaffId === item.id),
                        )
                        .map((c) => c.name)
                        .join(", ") || t("panel.noChair"),
                  })}{" "}
                  ·{" "}
                  <Link to="/yonetim/koltuklar">{t("panel.manageChairs")}</Link>
                </p>
              )}
              {resource === "services" && (
                <p className="muted">
                  {t("panel.staffForService", {
                    names:
                      data.staff
                        .filter(
                          (staff) =>
                            staff.active && staff.serviceIds.includes(item.id),
                        )
                        .map((staff) => staff.name)
                        .join(", ") || t("panel.noStaff"),
                  })}{" "}
                  ·{" "}
                  <Link to="/yonetim/calisanlar">{t("panel.manageStaff")}</Link>
                </p>
              )}
              {resource === "customers" && (
                <p className="muted">
                  {t("panel.customerBookings", {
                    count: data.reservations.filter(
                      (r) => r.customerId === item.id,
                    ).length,
                  })}
                </p>
              )}
              {resource === "chairs" && (
                <p className="muted">
                  {t("panel.linkedBookings", {
                    count: data.reservations.filter(
                      (r) =>
                        r.chairId === item.id &&
                        ["confirmed", "pending_payment", "in_service"].includes(
                          r.status,
                        ),
                    ).length,
                  })}
                </p>
              )}
            </div>
            <div className="row-actions">
              {["chairs", "staff", "services", "customers"].includes(
                resource,
              ) && (
                <Button variant="quiet" onClick={() => setRelated(item)}>
                  {t("panel.related")}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setSaved(false);
                  setEditing(item);
                }}
              >
                {t("copy.ea33b58c1d")}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <Notice>
          {list.length ? t("panel.noMatches") : t("copy.ecf31d8e19")}
        </Notice>
      )}
      {resource !== "salon" && (
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={filtered.length}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
      {related && (
        <Modal
          title={`${"name" in related ? related.name : ""} · ${t("panel.related")}`}
          onClose={() => setRelated(null)}
        >
          <AppointmentRows
            role="manager"
            rows={data.reservations.filter(
              (r) =>
                (resource === "chairs"
                  ? r.chairId
                  : resource === "staff"
                    ? r.staffId
                    : resource === "services"
                      ? r.serviceId
                      : r.customerId) === related.id,
            )}
          />
        </Modal>
      )}
      {editing && (
        <Editor
          key={editing.id}
          resource={resource}
          item={editing}
          data={data}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSaved(true);
          }}
        />
      )}
    </div>
  );
}
function Editor({
  resource,
  item,
  data,
  onClose,
  onSaved,
}: {
  resource: Resource;
  item: Item;
  data: s.Operations;
  onClose: () => void;
  onSaved: () => void;
}) {
  const values: Record<string, string> = Object.fromEntries(
    Object.entries(item)
      .filter(
        ([, value]) =>
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean",
      )
      .map(([key, value]) => [key, String(value)]),
  );
  if ("price" in item) {
    values.price = (item.price.amount / 100).toFixed(2);
    values.deposit = (item.deposit.amount / 100).toFixed(2);
  }
  if (resource === "chairs")
    values.assignedStaffId =
      (item as s.Operations["chairs"][number]).assignedStaffId ?? "";
  const form = useForm<Record<string, string>>({ defaultValues: values }),
    cache = useQueryClient();
  const [validation, setValidation] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>(
    "serviceIds" in item ? [...item.serviceIds] : [],
  );
  const [serviceError, setServiceError] = useState(false);
  const serviceGroup = useRef<HTMLFieldSetElement>(null);
  const [intent] = useState(() => new RequestIntent());
  const [discard, setDiscard] = useState(false);
  const dirty =
    form.formState.isDirty ||
    ("serviceIds" in item &&
      [...serviceIds].sort().join() !== [...item.serviceIds].sort().join());
  function close() {
    if (mutation.isPending) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  const mutation = useMutation({
    mutationFn: (body: s.ManagementChange) =>
      request("/management", s.operations, {
        method: "PUT",
        body,
        key: intent.keyFor(body),
      }),
    onSuccess: async () => {
      intent.complete();
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["operations"] }),
        cache.invalidateQueries({ queryKey: ["catalog"] }),
        cache.invalidateQueries({ queryKey: ["availability"] }),
      ]);
      onSaved();
    },
  });
  function save(values: Record<string, string>) {
    if (resource === "staff" && serviceIds.length === 0) {
      setServiceError(true);
      serviceGroup.current?.focus();
      return;
    }
    const value = {
      ...item,
      ...values,
      active: values.active === "true",
      ...(resource === "salon"
        ? {
            slotIntervalMinutes: Number(values.slotIntervalMinutes),
            bookingDays: Number(values.bookingDays),
          }
        : {}),
      ...(resource === "staff" ? { serviceIds } : {}),
      ...(resource === "chairs"
        ? { assignedStaffId: values.assignedStaffId || null }
        : {}),
      ...(resource === "services"
        ? {
            durationMinutes: Number(values.durationMinutes),
            price: { amount: amount(values.price), currency: "TRY" },
            deposit: { amount: amount(values.deposit), currency: "TRY" },
          }
        : {}),
    };
    const parsed = s.managementChange.safeParse({ resource, value });
    if (!parsed.success) {
      setValidation(t("copy.706816db12"));
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[1] ?? "");
        if (field in values)
          form.setError(field, { message: t("panel.invalidField") });
      }
      const first = String(parsed.error.issues[0]?.path[1] ?? "");
      if (first in values) form.setFocus(first);
      return;
    }
    setValidation("");
    mutation.mutate(parsed.data);
  }
  const field = (name: string, label: string, type = "text") => (
    <Field
      key={name}
      label={label}
      type={type}
      {...form.register(name, { required: true })}
      error={
        form.formState.errors[name]?.message ||
        (form.formState.errors[name] ? t("validation.required") : undefined)
      }
    />
  );
  return (
    <Modal
      title={t("panel.edit")}
      onClose={onClose}
      dirty={dirty}
      busy={mutation.isPending}
    >
      {discard && (
        <Notice>
          <p>{t("panel.unsaved")}</p>
          <div className="actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDiscard(false)}
            >
              {t("panel.continueEditing")}
            </Button>
            <Button type="button" onClick={onClose}>
              {t("panel.discard")}
            </Button>
          </div>
        </Notice>
      )}
      <form
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="editor stack"
      >
        {resource !== "schedules" && field("name", t("copy.1d97c9fec3"))}
        {resource === "services" && (
          <>
            {field("description", t("copy.e7ae0d9a16"))}
            {field("durationMinutes", t("copy.cc48405519"), "number")}
            {field("price", t("copy.95cabb7f82"))}
            {field("deposit", t("copy.32cf3ae31e"))}
          </>
        )}
        {resource === "staff" && field("title", t("copy.e2455aa210"))}
        {resource === "chairs" && (
          <div className="field">
            <label htmlFor="chair-staff">{t("panel.assignedStaff")}</label>
            <select id="chair-staff" {...form.register("assignedStaffId")}>
              <option value="">{t("panel.sharedChair")}</option>
              {data.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                  {!staff.active ? ` · ${t("copy.edd812578c")}` : ""}
                </option>
              ))}
            </select>
            <p className="muted">{t("panel.chairHint")}</p>
          </div>
        )}
        {resource === "staff" && (
          <fieldset
            ref={serviceGroup}
            tabIndex={-1}
            aria-describedby={
              serviceError ? "staff-services-error" : "staff-services-hint"
            }
            aria-invalid={serviceError}
            disabled={mutation.isPending}
          >
            <legend>{t("staff.services")}</legend>
            <p id="staff-services-hint" className="muted">
              {t("staff.servicesHint")}
            </p>
            <div className="stack">
              {data.services.map((service) => (
                <label className="checkbox" key={service.id}>
                  <input
                    type="checkbox"
                    name="staff-service"
                    value={service.id}
                    checked={serviceIds.includes(service.id)}
                    onChange={(event) => {
                      setServiceIds((current) =>
                        event.target.checked
                          ? [...current, service.id]
                          : current.filter((id) => id !== service.id),
                      );
                      setServiceError(false);
                    }}
                  />
                  <span>
                    {service.name}
                    {!service.active && ` · ${t("copy.edd812578c")}`}
                  </span>
                </label>
              ))}
            </div>
            {data.services.length === 0 && (
              <Notice>{t("staff.createServiceFirst")}</Notice>
            )}
            {serviceError && (
              <p id="staff-services-error" className="error" role="alert">
                {t("staff.serviceRequired")}
              </p>
            )}
          </fieldset>
        )}
        {resource === "customers" && (
          <>
            {field("email", t("copy.e1081b69d8"), "email")}
            {field("phone", t("copy.fa6906d76e"), "tel")}
          </>
        )}
        {resource === "salon" && (
          <>
            <Field
              label={t("slots.interval")}
              type="number"
              min={5}
              max={120}
              step={1}
              {...form.register("slotIntervalMinutes", {
                required: true,
                min: 5,
                max: 120,
              })}
              hint={t("slots.intervalHint")}
              error={
                form.formState.errors.slotIntervalMinutes
                  ? t("slots.intervalError")
                  : undefined
              }
            />
            {field("description", t("copy.7f9f330475"))}
            {field("address", t("copy.32c6bebf1c"))}
            {field("phone", t("copy.fa6906d76e"), "tel")}
            <p>
              {t("copy.ae1cbb94a2")}
              {data.salon.timezone}
            </p>
          </>
        )}
        {resource === "schedules" && (
          <>
            <label htmlFor="schedule-staff">{t("copy.0f548e0c5d")}</label>
            <select id="schedule-staff" {...form.register("staffId")}>
              {data.staff.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            {field("date", t("copy.6ff8021ebc"), "date")}
            <label htmlFor="schedule-kind">{t("copy.7fee5d58c7")}</label>
            <select id="schedule-kind" {...form.register("kind")}>
              <option value="shift">{t("copy.e42274ad38")}</option>
              <option value="break">{t("copy.d0dd99fbac")}</option>
              <option value="leave">{t("copy.a5fad871d8")}</option>
            </select>
            {field("startsAt", t("copy.296ccc7ac2"), "time")}
            {field("endsAt", t("copy.b649bea15b"), "time")}
            <p className="muted">{t("panel.overnight")}</p>
            <Field label={t("panel.scheduleNote")} {...form.register("note")} />
          </>
        )}
        {["services", "staff", "chairs"].includes(resource) && (
          <>
            <label htmlFor="active">{t("copy.8bd057388e")}</label>
            <select id="active" {...form.register("active")}>
              <option value="true">{t("copy.d5f8845474")}</option>
              <option value="false">{t("copy.edd812578c")}</option>
            </select>
          </>
        )}
        {validation && <Notice error>{validation}</Notice>}
        {mutation.error && <Notice error>{mutation.error.message}</Notice>}
        <div className="actions">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("panel.saving") : t("copy.c1fe2ecdff")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={close}
          >
            {t("copy.39a8d28c1c")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { t } from "../../shared/i18n";
import { useRef, useState } from "react";
import { RequestIntent } from "../../shared/api/intent";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as s from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import { Button, Field, Notice } from "../../shared/ui";
import { formatMoney } from "../../shared/format";
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
  const list: Item[] = resource === "salon" ? [data.salon] : data[resource];
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
    if (resource === "chairs") return { id, name: "", active: true };
    if (resource === "customers") return { id, name: "", email: "", phone: "" };
    return {
      id,
      staffId: data.staff[0]?.id ?? "",
      date: "2026-10-26",
      kind: "shift",
      startsAt: "09:00",
      endsAt: "19:00",
      note: "",
    };
  }
  return (
    <div className="stack">
      {saved && <Notice>{t("copy.de86a3b339")}</Notice>}
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
      <div className="resource-list">
        {list.map((item) => (
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
                          : t("copy.d2ff5a711e")}
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
            </div>
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
        ))}
      </div>
      {list.length === 0 && <Notice>{t("copy.ecf31d8e19")}</Notice>}
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
  const form = useForm<Record<string, string>>({ defaultValues: values }),
    cache = useQueryClient();
  const [validation, setValidation] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>(
    "serviceIds" in item ? [...item.serviceIds] : [],
  );
  const [serviceError, setServiceError] = useState(false);
  const serviceGroup = useRef<HTMLFieldSetElement>(null);
  const [intent] = useState(() => new RequestIntent());
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
      ...(resource === "staff" ? { serviceIds } : {}),
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
      error={form.formState.errors[name] ? t("validation.required") : undefined}
    />
  );
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(save)}
      className="editor stack"
    >
      <h2>{t("copy.71a5d04343")}</h2>
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
          {field("note", t("copy.e7ae0d9a16"))}
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
          {mutation.isPending ? "Kaydediliyor…" : t("copy.c1fe2ecdff")}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("copy.39a8d28c1c")}
        </Button>
      </div>
    </form>
  );
}

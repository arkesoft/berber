import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import * as s from "../../contracts/schemas";
import { request, ApiError } from "../../shared/api/http";
import { RequestIntent } from "../../shared/api/intent";
import { Button, Field, Modal, Notice, QueryState } from "../../shared/ui";
import { PagedList } from "../../shared/PagedList";
import { formatMoney, formatDate, formatTime } from "../../shared/format";
import { t } from "../../shared/i18n";

export function receivedAmount(r: s.Reservation) {
  return r.received?.amount ?? 0;
}
export function collectionStatus(r: s.Reservation) {
  return r.total.amount === 0
    ? "zero"
    : receivedAmount(r) === 0
      ? "unpaid"
      : receivedAmount(r) < r.total.amount
        ? "partial"
        : "paid";
}
const money = (amount: number) => formatMoney({ amount, currency: "TRY" });
export function CollectionSummary({
  reservation: r,
}: {
  reservation: s.Reservation;
}) {
  return (
    <div className="stack collection-summary">
      <strong>{t(`collection.${collectionStatus(r)}`)}</strong>
      <span>
        {t("collection.received")}: {money(receivedAmount(r))} ·{" "}
        {t("collection.remaining")}: {money(r.total.amount - receivedAmount(r))}
      </span>
    </div>
  );
}
export function CollectionButton({
  reservation,
}: {
  reservation: s.Reservation;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("collection.title")}
      </Button>
      {open && (
        <CollectionDialog id={reservation.id} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
function CollectionDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [intent] = useState(() => new RequestIntent());
  const [amount, setAmount] = useState("");
  const [method, setMethod] =
    useState<z.infer<typeof s.collectionEntry>["method"]>("cash");
  const [note, setNote] = useState("");
  const [reverse, setReverse] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const query = useQuery({
    queryKey: ["collections", id],
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: ({ signal }) =>
      request(`/reservations/${id}/collections`, s.collections, { signal }),
  });
  const mutation = useMutation({
    mutationFn: (body: z.infer<typeof s.collectionRequest>) =>
      request(`/reservations/${id}/collections`, s.collections, {
        method: "POST",
        body,
        key: intent.keyFor(body),
      }),
    onSuccess: async (data, body) => {
      intent.complete();
      setAmount("");
      setNote("");
      setReverse(null);
      setReason("");
      setError("");
      setSaved(
        t(
          body.action === "receive"
            ? "collection.saved"
            : "collection.corrected",
        ),
      );
      cache.setQueryData(["collections", id], data);
      await Promise.all(
        ["operations", "reservations", "availability"].map((key) =>
          cache.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT")
        void query.refetch();
    },
  });
  const r = query.data?.reservation;
  const closed = !!r && ["cancelled", "expired", "no_show"].includes(r.status);
  return (
    <Modal
      title={t("collection.title")}
      onClose={onClose}
      dirty={!!(amount || note || reason)}
      busy={mutation.isPending}
    >
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {r && (
          <div className="stack">
            <div>
              <h3>
                {r.customer.name} · {r.serviceName}
              </h3>
              <p>
                {formatDate(r.startsAt)} · {formatTime(r.startsAt)} ·{" "}
                {r.staffName}
              </p>
              <p>
                {t("collection.total")}: {formatMoney(r.total)}
              </p>
              <CollectionSummary reservation={r} />
            </div>
            <Notice>{t("collection.hint")}</Notice>
            {closed && <Notice>{t("collection.closed")}</Notice>}
            {["cancelled", "expired"].includes(r.status) &&
              receivedAmount(r) > 0 && (
                <Notice>{t("collection.review")}</Notice>
              )}
            {saved && <p role="status">{saved}</p>}
            {(error || mutation.error) && (
              <Notice error>{error || mutation.error?.message}</Notice>
            )}
            {!closed && receivedAmount(r) < r.total.amount && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const normalized = amount.trim().replace(",", ".");
                  const parts = normalized.split(".");
                  const minor = /^\d{1,7}(\.\d{1,2})?$/.test(normalized)
                    ? Number(parts[0]) * 100 +
                      Number((parts[1] ?? "").padEnd(2, "0"))
                    : NaN;
                  if (
                    !Number.isSafeInteger(minor) ||
                    minor <= 0 ||
                    minor > r.total.amount - receivedAmount(r)
                  ) {
                    setError(t("collection.invalidAmount"));
                    document.getElementById("collection-amount")?.focus();
                    return;
                  }
                  setError("");
                  setSaved("");
                  mutation.mutate({
                    action: "receive",
                    version: r.version,
                    amount: minor,
                    method,
                    note,
                  });
                }}
              >
                <Field
                  id="collection-amount"
                  label={t("collection.amount")}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  maxLength={10}
                />
                <div className="field">
                  <label htmlFor="collection-method">
                    {t("collection.method")}
                  </label>
                  <select
                    id="collection-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as typeof method)}
                  >
                    {(["cash", "card", "bank_transfer"] as const).map((m) => (
                      <option key={m} value={m}>
                        {t(`collection.${m}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label={t("collection.note")}
                  id="collection-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                />
                <Button type="submit" disabled={mutation.isPending}>
                  {t(mutation.isPending ? "common.loading" : "collection.save")}
                </Button>
              </form>
            )}
            {reverse && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSaved("");
                  mutation.mutate({
                    action: "reverse",
                    version: r.version,
                    entryId: reverse,
                    note: reason.trim(),
                  });
                }}
              >
                <Notice>{t("collection.reverseHint")}</Notice>
                <Field
                  label={t("collection.reason")}
                  id="collection-reason"
                  required
                  minLength={3}
                  maxLength={200}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="actions">
                  <Button
                    type="submit"
                    disabled={mutation.isPending || reason.trim().length < 3}
                  >
                    {t("collection.reverseConfirm")}
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setReverse(null);
                      setReason("");
                    }}
                  >
                    {t("panel.close")}
                  </Button>
                </div>
              </form>
            )}
            <h3>{t("collection.history")}</h3>
            {query.data!.entries.length === 0 ? (
              <p>{t("collection.empty")}</p>
            ) : (
              <PagedList
                items={[...query.data!.entries].reverse()}
                searchText={(e) => `${e.note} ${t(`collection.${e.method}`)}`}
                renderItem={(entry) => {
                  const reversed = query.data!.entries.some(
                    (e) => e.reversesId === entry.id,
                  );
                  return (
                    <article className="resource-row" key={entry.id}>
                      <div>
                        <strong>
                          {entry.reversesId ? "−" : "+"}
                          {formatMoney(entry.amount)} ·{" "}
                          {t(`collection.${entry.method}`)}
                        </strong>
                        <p>
                          {formatDate(entry.createdAt)} ·{" "}
                          {formatTime(entry.createdAt)}
                        </p>
                        <p>{entry.note}</p>
                        {(entry.reversesId || reversed) && (
                          <span>
                            {t(
                              entry.reversesId
                                ? "collection.reversal"
                                : "collection.reversed",
                            )}
                          </span>
                        )}
                      </div>
                      {!entry.reversesId && !reversed && (
                        <Button
                          variant="quiet"
                          disabled={mutation.isPending}
                          onClick={() => {
                            setReverse(entry.id);
                            setReason("");
                          }}
                        >
                          {t("collection.reverse")}
                        </Button>
                      )}
                    </article>
                  );
                }}
              />
            )}
          </div>
        )}
      </QueryState>
    </Modal>
  );
}

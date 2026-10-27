import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { paymentSettings } from "../../contracts/schemas";
import { request } from "../../shared/api/http";
import { RequestIntent } from "../../shared/api/intent";
import { Button, Field, Notice, QueryState } from "../../shared/ui";
import { t } from "../../shared/i18n";
import "./payment-settings.css";

type Draft = {
  bank: string;
  holder: string;
  iban: string;
  provider: string;
  merchant: string;
};
const emptyDraft: Draft = {
  bank: "",
  holder: "",
  iban: "",
  provider: "",
  merchant: "",
};

// Bank/provider draft remains local; the separate policy form is persisted.
export function PaymentSettings() {
  const { register, handleSubmit, reset } = useForm<Draft>({
    defaultValues: emptyDraft,
  });
  const [preview, setPreview] = useState<Draft | null>(null);
  const [cleared, setCleared] = useState(false);
  return (
    <div className="payment-settings stack">
      <PaymentPreferences />
      <Notice>
        <strong>{t("paymentSettings.draft")}</strong>
        <p>{t("paymentSettings.scope")}</p>
      </Notice>
      <form
        className="stack"
        autoComplete="off"
        onSubmit={handleSubmit((draft) => {
          setPreview(draft);
          setCleared(false);
        })}
      >
        <section
          className="payment-settings-section"
          aria-labelledby="bank-heading"
        >
          <div>
            <h2 id="bank-heading">{t("paymentSettings.bank")}</h2>
            <p className="muted">{t("paymentSettings.bankHint")}</p>
          </div>
          <div className="stack">
            <Field
              label={t("paymentSettings.bankName")}
              id="payment-bank"
              maxLength={120}
              {...register("bank")}
            />
            <Field
              label={t("paymentSettings.holder")}
              id="payment-holder"
              maxLength={160}
              {...register("holder")}
            />
            <Field
              label={t("paymentSettings.iban")}
              id="payment-iban"
              maxLength={42}
              spellCheck={false}
              {...register("iban")}
            />
          </div>
        </section>
        <section
          className="payment-settings-section"
          aria-labelledby="pos-heading"
        >
          <div>
            <h2 id="pos-heading">{t("paymentSettings.pos")}</h2>
            <p className="muted">{t("paymentSettings.posHint")}</p>
            <span className="payment-connection-status">
              {t("paymentSettings.disconnected")}
            </span>
          </div>
          <div className="stack">
            <Field
              label={t("paymentSettings.provider")}
              id="payment-provider"
              placeholder={t("paymentSettings.undecided")}
              maxLength={120}
              {...register("provider")}
            />
            <Field
              label={t("paymentSettings.merchant")}
              id="payment-merchant"
              maxLength={80}
              {...register("merchant")}
            />
            <Field
              label={t("paymentSettings.credentials")}
              name="payment-credentials"
              disabled
              placeholder={t("paymentSettings.undecided")}
              hint={t("paymentSettings.credentialsHint")}
            />
          </div>
        </section>
        <div className="actions">
          <Button type="submit">{t("paymentSettings.preview")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              reset(emptyDraft);
              setPreview(null);
              setCleared(true);
            }}
          >
            {t("paymentSettings.clear")}
          </Button>
        </div>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {cleared && <p>{t("paymentSettings.cleared")}</p>}
        {preview && (
          <section
            className="payment-preview"
            aria-labelledby="payment-preview-heading"
          >
            <h2 id="payment-preview-heading">
              {t("paymentSettings.previewTitle")}
            </h2>
            <p className="muted">{t("paymentSettings.previewHint")}</p>
            <dl>
              {(
                [
                  ["bank", "paymentSettings.bankName"],
                  ["holder", "paymentSettings.holder"],
                  ["iban", "paymentSettings.iban"],
                  ["provider", "paymentSettings.provider"],
                  ["merchant", "paymentSettings.merchant"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <dt>{t(label)}</dt>
                  <dd>{preview[key].trim() || t("paymentSettings.empty")}</dd>
                </div>
              ))}
            </dl>
            <p>{t("paymentSettings.disconnected")}</p>
          </section>
        )}
      </div>
    </div>
  );
}

function PaymentPreferences() {
  const cache = useQueryClient();
  const [saved, setSaved] = useState(false);
  const query = useQuery({
    queryKey: ["payment-settings"],
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      request("/payment-settings", paymentSettings, { signal }),
  });
  return (
    <>
      {saved && <p role="status">{t("paymentPolicy.saved")}</p>}
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      >
        {query.data && (
          <PreferencesForm
            key={query.data.version}
            value={query.data}
            onChange={() => setSaved(false)}
            onSaved={(result) => {
              cache.setQueryData(["payment-settings"], result);
              setSaved(true);
            }}
          />
        )}
      </QueryState>
    </>
  );
}
function PreferencesForm({
  value,
  onSaved,
  onChange,
}: {
  value: z.infer<typeof paymentSettings>;
  onSaved: (value: z.infer<typeof paymentSettings>) => void;
  onChange: () => void;
}) {
  const cache = useQueryClient();
  const [draft, setDraft] = useState(value);
  const [intent] = useState(() => new RequestIntent());
  const mutation = useMutation({
    mutationFn: () =>
      request("/payment-settings", paymentSettings, {
        method: "PUT",
        body: draft,
        key: intent.keyFor(draft),
      }),
    onSuccess: async (result) => {
      intent.complete();
      setDraft(result);
      onSaved(result);
      await Promise.all(
        ["catalog", "operations"].map((key) =>
          cache.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
  });
  return (
    <form
      className="stack payment-policy"
      onSubmit={(e) => {
        e.preventDefault();
        onChange();
        mutation.mutate();
      }}
    >
      <h2>{t("paymentPolicy.title")}</h2>
      <label className="policy-toggle">
        <input
          type="checkbox"
          checked={draft.depositEnabled}
          onChange={(e) => {
            onChange();
            setDraft({ ...draft, depositEnabled: e.target.checked });
          }}
        />
        <strong>{t("paymentPolicy.deposit")}</strong>
      </label>
      <p className="muted">{t("paymentPolicy.depositHint")}</p>
      <label className="policy-toggle">
        <input
          type="checkbox"
          checked={draft.onlinePaymentVisible}
          onChange={(e) => {
            onChange();
            setDraft({ ...draft, onlinePaymentVisible: e.target.checked });
          }}
        />
        <strong>{t("paymentPolicy.visible")}</strong>
      </label>
      <p className="muted">{t("paymentPolicy.visibleHint")}</p>
      <Notice>{t("paymentPolicy.disconnected")}</Notice>
      {mutation.error && (
        <Notice error>
          {mutation.error.message}{" "}
          <Button
            variant="quiet"
            onClick={() =>
              void cache.invalidateQueries({ queryKey: ["payment-settings"] })
            }
          >
            {t("common.retry")}
          </Button>
        </Notice>
      )}
      <div className="actions">
        <Button type="submit" disabled={mutation.isPending}>
          {t(mutation.isPending ? "common.loading" : "common.save")}
        </Button>
      </div>
    </form>
  );
}

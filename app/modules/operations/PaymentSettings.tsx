import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Field, Notice } from "../../shared/ui";
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

// Deliberately local UI state. No API, persistence or provider selection.
export function PaymentSettings() {
  const { register, handleSubmit, reset } = useForm<Draft>({
    defaultValues: emptyDraft,
  });
  const [preview, setPreview] = useState<Draft | null>(null);
  const [cleared, setCleared] = useState(false);
  return (
    <div className="payment-settings stack">
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

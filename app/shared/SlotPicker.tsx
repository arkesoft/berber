import { useId } from "react";
import type { z } from "zod";
import type { availability } from "../contracts/schemas";
import { formatTime } from "./format";
import { t } from "./i18n";
type Availability = z.infer<typeof availability>;
export function SlotPicker({
  data,
  name,
  value,
  onChange,
  legend,
}: {
  data: Availability;
  name: string;
  value: string;
  onChange: (id: string) => void;
  legend: string;
}) {
  const hintId = useId();
  const options = [
    ...data.slots.map((slot) => ({ ...slot, status: "available" as const })),
    ...data.unavailableSlots,
  ].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return (
    <div className="slot-picker">
      {options.length > 0 ? (
        <fieldset className="slot-grid" aria-describedby={hintId}>
          <legend>{legend}</legend>
          {options.map((slot) => {
            const selected = slot.status === "available" && value === slot.id;
            return (
              <label
                className={`slot slot-${slot.status}${selected ? " selected" : ""}`}
                key={slot.id}
              >
                <input
                  type="radio"
                  name={name}
                  disabled={slot.status !== "available"}
                  checked={selected}
                  onChange={() => onChange(slot.id)}
                />
                <span className="slot-label">
                  <strong>{formatTime(slot.startsAt, data.timezone)}</strong>{" "}
                  <span>
                    {t(`slots.${selected ? "selected" : slot.status}`)}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        <p role="status">{t("slots.empty")}</p>
      )}
      {options.length > 0 && data.slots.length === 0 && (
        <p role="status">{t("slots.noneAvailable")}</p>
      )}
      <div className="slot-legend" id={hintId} aria-label={t("slots.legend")}>
        {(["available", "selected", "busy", "unavailable"] as const).map(
          (status) => (
            <span key={status}>
              <i
                className={`slot-swatch slot-swatch-${status}`}
                aria-hidden="true"
              />
              {t(`slots.${status}`)}
            </span>
          ),
        )}
      </div>
      <details className="slot-help">
        <summary>
          <span aria-hidden="true">? </span>
          {t("slots.help")}
        </summary>
        <dl>
          {(
            ["available", "selected", "busy", "unavailable", "past"] as const
          ).map((status) => (
            <div key={status}>
              <dt>{t(`slots.${status}`)}</dt>
              <dd>{t(`slots.help.${status}`)}</dd>
            </div>
          ))}
        </dl>
        <p>{t("slots.liveHint")}</p>
      </details>
    </div>
  );
}

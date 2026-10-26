import {
  useRef,
  useId,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { t } from "./i18n";
export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = props.id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
      />
      {hint && (
        <p id={`${id}-hint`} className="muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  children,
}: {
  pending: boolean;
  error: Error | null;
  retry?: () => void;
  children: ReactNode;
}) {
  if (pending)
    return (
      <div className="loading" role="status">
        {t("common.loading")}
        <span className="loading-line" />
        <span className="loading-line" />
      </div>
    );
  if (error)
    return (
      <Notice error>
        {error.message}{" "}
        {retry && (
          <Button variant="secondary" onClick={retry}>
            {t("common.retry")}
          </Button>
        )}
      </Notice>
    );
  return <>{children}</>;
}
export function Confirm({
  label,
  description,
  onConfirm,
}: {
  label: string;
  description: string;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  return (
    <>
      <Button variant="quiet" onClick={() => ref.current?.showModal()}>
        {label}
      </Button>
      <dialog ref={ref} aria-labelledby={id}>
        <h2 id={id}>{label}</h2>
        <p>{description}</p>
        <div className="actions">
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            {t("copy.39a8d28c1c")}
          </Button>
          <Button
            onClick={() => {
              ref.current?.close();
              onConfirm();
            }}
          >
            {t("copy.828652b833")}
          </Button>
        </div>
      </dialog>
    </>
  );
}

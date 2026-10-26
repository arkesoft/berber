import { t } from "../../shared/i18n";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { Role } from "../../contracts/schemas";
import { QueryState } from "../../shared/ui";
import { useSession } from "./session";
export function Access({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const auth = useSession();
  if (auth.isPending || auth.error)
    return (
      <QueryState
        pending={auth.isPending}
        error={auth.error}
        retry={() => void auth.refetch()}
      >
        {null}
      </QueryState>
    );
  if (!auth.data?.user)
    return (
      <section className="system-page">
        <h1 tabIndex={-1}>{t("copy.68fb1e808c")}</h1>
        <p>{t("copy.2c359406bc")}</p>
        <Link className="button primary" to="/giris">
          {t("copy.b872b116e8")}
        </Link>
      </section>
    );
  if (!roles.includes(auth.data.user.role))
    return (
      <section className="system-page">
        <h1 tabIndex={-1}>{t("copy.7226ddd8f4")}</h1>
        <p>{t("copy.757963f77a")}</p>
        <Link className="button primary" to="/">
          {t("copy.6d685d12cb")}
        </Link>
      </section>
    );
  return <>{children}</>;
}

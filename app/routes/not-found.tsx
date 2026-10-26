import { t } from "../shared/i18n";
import { Link } from "react-router";
export function meta() {
  return [
    { title: t("copy.54862c4b8a") },
    { name: "robots", content: "noindex" },
  ];
}
export default function NotFound() {
  return (
    <section className="system-page">
      <h1 tabIndex={-1}>{t("copy.54862c4b8a")}</h1>
      <p>{t("copy.7b859c2002")}</p>
      <Link className="button primary" to="/">
        {t("copy.6d685d12cb")}
      </Link>
    </section>
  );
}

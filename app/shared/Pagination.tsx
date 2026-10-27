import { useId } from "react";
import { Button } from "./ui";
import { t } from "./i18n";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const id = useId();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pagination" aria-label={t("pagination.label")}>
      <p role="status">
        {t("pagination.range", {
          total,
          from: total ? (page - 1) * pageSize + 1 : 0,
          to: Math.min(page * pageSize, total),
        })}
      </p>
      <div className="pagination-controls">
        <label htmlFor={id}>{t("pagination.size")}</label>
        <select
          id={id}
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
        >
          {[10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {t("pagination.previous")}
        </Button>
        <span>{t("pagination.page", { page, pages })}</span>
        <Button
          variant="secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          {t("pagination.next")}
        </Button>
      </div>
    </nav>
  );
}

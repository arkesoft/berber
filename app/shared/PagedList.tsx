import { useState, type ReactNode } from "react";
import { Field, Notice } from "./ui";
import { Pagination } from "./Pagination";
import { t } from "./i18n";

export function PagedList<T extends { id: string }>({
  items,
  searchText,
  renderItem,
}: {
  items: T[];
  searchText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const filtered = items.filter((item) =>
    searchText(item)
      .toLocaleLowerCase("tr")
      .includes(search.trim().toLocaleLowerCase("tr")),
  );
  const current = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / size)),
  );
  return (
    <div className="stack">
      <Field
        name="list-search"
        label={t("panel.search")}
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <div className="resource-list">
        {filtered.slice((current - 1) * size, current * size).map(renderItem)}
      </div>
      {!filtered.length && <Notice>{t("panel.noMatches")}</Notice>}
      <Pagination
        page={current}
        pageSize={size}
        total={filtered.length}
        onPage={setPage}
        onPageSize={(size) => {
          setSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createTranslator } from "@/lib/i18n";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

import AccountsCards from "./AccountsCards";
import AccountsTable from "./AccountsTable";
import { normalize } from "./account-utils";
import type { AccountRecord, SortColumn, SortState } from "./types";

type AccountsTabsProps = {
  accounts: AccountRecord[];
  errorMessage?: string;
};

type ViewMode = "cards" | "table";

const PAGE_SIZE = 8;

const getComparableValue = (account: AccountRecord, column: SortColumn) => {
  switch (column) {
    case "name":
      return account.name ?? "";
    case "type":
      return account.type ?? "";
    case "credit_limit":
      return account.credit_limit ?? -Infinity;
    case "created_at":
    default:
      return account.created_at ?? "";
  }
};

export default function AccountsTabs({ accounts, errorMessage }: AccountsTabsProps) {
  const t = createTranslator();
  const [view, setView] = useState<ViewMode>("cards");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" });

  const handleSortChange = useCallback((column: SortColumn) => {
    setSort((previous) => {
      if (previous.column === column) {
        return { column, direction: previous.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  }, []);

  const filteredAccounts = useMemo(() => {
    const normalizedSearch = normalize(searchValue);
    if (!normalizedSearch) {
      return [...accounts];
    }
    return accounts.filter((account) => normalize(account.name ?? "").includes(normalizedSearch));
  }, [accounts, searchValue]);

  const sortedAccounts = useMemo(() => {
    const copy = [...filteredAccounts];
    copy.sort((a, b) => {
      const aValue = getComparableValue(a, sort.column);
      const bValue = getComparableValue(b, sort.column);
      if (sort.column === "credit_limit") {
        const aNumber = typeof aValue === "number" ? aValue : Number.parseFloat(String(aValue));
        const bNumber = typeof bValue === "number" ? bValue : Number.parseFloat(String(bValue));
        const safeA = Number.isFinite(aNumber) ? aNumber : Number.NEGATIVE_INFINITY;
        const safeB = Number.isFinite(bNumber) ? bNumber : Number.NEGATIVE_INFINITY;
        return sort.direction === "asc" ? safeA - safeB : safeB - safeA;
      }
      if (sort.column === "created_at") {
        const aDate = aValue ? new Date(String(aValue)).getTime() : 0;
        const bDate = bValue ? new Date(String(bValue)).getTime() : 0;
        return sort.direction === "asc" ? aDate - bDate : bDate - aDate;
      }
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      const comparison = aString.localeCompare(bString, undefined, { sensitivity: "base" });
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return copy;
  }, [filteredAccounts, sort]);

  useEffect(() => {
    setPage(1);
  }, [searchValue, sort, view, accounts.length]);

  useEffect(() => {
    if (view !== "table") {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / PAGE_SIZE));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, sortedAccounts.length, view]);

  const paginatedAccounts = useMemo(() => {
    if (view !== "table") {
      return sortedAccounts;
    }
    const start = (page - 1) * PAGE_SIZE;
    return sortedAccounts.slice(start, start + PAGE_SIZE);
  }, [page, sortedAccounts, view]);

  const summaryLabel = useMemo(() => {
    if (!accounts.length) {
      return t("accounts.table.empty");
    }
    if (filteredAccounts.length === 0) {
      return t("accounts.table.empty");
    }
    if (filteredAccounts.length === accounts.length) {
      if (filteredAccounts.length === 1) {
        return t("accountsPage.summary.single");
      }
      return t("accountsPage.summary.all", { count: filteredAccounts.length });
    }
    if (filteredAccounts.length === 1) {
      return t("accountsPage.summary.filteredSingle", { total: accounts.length });
    }
    return t("accountsPage.summary.filtered", { count: filteredAccounts.length, total: accounts.length });
  }, [accounts.length, filteredAccounts.length, t]);

  const handleAdd = useCallback(() => {
    window.alert(t("accountsPage.actions.addPlaceholder"));
  }, [t]);

  const handleEdit = useCallback(
    (account: AccountRecord) => {
      window.alert(t("accountsPage.actions.editPlaceholder", { name: account.name }));
    },
    [t]
  );

  const handleDelete = useCallback(
    (account: AccountRecord) => {
      window.alert(t("accountsPage.actions.deletePlaceholder", { name: account.name }));
    },
    [t]
  );

  const getViewButtonClasses = useCallback(
    (mode: ViewMode) =>
      `rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
        view === mode ? "bg-indigo-600 text-white shadow" : "text-gray-600 hover:bg-white"
      }`,
    [view]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">{t("accountsPage.title")}</h2>
            <p className="text-sm text-gray-600">{summaryLabel}</p>
            {errorMessage ? <p className="text-xs text-rose-600">{errorMessage}</p> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="inline-flex rounded-full border border-gray-200 bg-slate-50 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("cards")}
                className={getViewButtonClasses("cards")}
                aria-pressed={view === "cards"}
              >
                {t("accountsPage.views.cards")}
              </button>
              <button
                type="button"
                onClick={() => setView("table")}
                className={getViewButtonClasses("table")}
                aria-pressed={view === "table"}
              >
                {t("accountsPage.views.table")}
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {t("accountsPage.actions.add")}
            </button>
          </div>
        </div>
      </div>

      <CollapsibleSection
        title="Search & filter"
        description="Narrow down accounts by name."
        open={searchOpen}
        onToggle={setSearchOpen}
        openLabel="Show filters"
        closeLabel="Hide filters"
      >
        <label className="flex flex-col gap-2 text-sm font-semibold text-gray-800" htmlFor="accounts-search">
          <span>{t("accountsPage.search.label")}</span>
          <div className="relative">
            <input
              id="accounts-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={t("accountsPage.search.placeholder")}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => setSearchValue("")}
                className="absolute right-2 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                aria-label={t("common.clear")}
              >
                ×
              </button>
            ) : null}
          </div>
        </label>
        <p className="text-xs text-gray-500">{t("accountsPage.search.help")}</p>
      </CollapsibleSection>

      {errorMessage ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
      ) : null}

      {view === "cards" ? (
        <AccountsCards accounts={sortedAccounts} onEdit={handleEdit} onDelete={handleDelete} summaryLabel={summaryLabel} />
      ) : (
        <AccountsTable
          accounts={paginatedAccounts}
          sort={sort}
          onSortChange={handleSortChange}
          page={page}
          pageSize={PAGE_SIZE}
          total={sortedAccounts.length}
          onPageChange={(nextPage) => setPage(nextPage)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CustomSelect, { Option } from "@/components/forms/CustomSelect";
import DeleteButton from "./DeleteButton";
import { createTranslator } from "@/lib/i18n";

import type { AccountRecord, TransactionFilters, TransactionListItem } from "./page";

type TransactionsViewProps = {
  transactions: TransactionListItem[];
  totalCount: number;
  accounts: AccountRecord[];
  filters: TransactionFilters;
};

type NatureTab = {
  value: TransactionFilters["nature"];
  labelKey: "transactions.tabs.all" | "transactions.tabs.income" | "transactions.tabs.expense" | "transactions.tabs.transfer";
};

const natureTabs: NatureTab[] = [
  { value: "all", labelKey: "transactions.tabs.all" },
  { value: "income", labelKey: "transactions.tabs.income" },
  { value: "expense", labelKey: "transactions.tabs.expense" },
  { value: "transfer", labelKey: "transactions.tabs.transfer" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "VND" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: monthFormatter.format(new Date(2000, index, 1)),
}));

const quarterOptions = [1, 2, 3, 4].map((value) => ({ value: String(value), label: `Q${value}` }));

const formatCurrency = (amount: number) => currencyFormatter.format(amount);
const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US");

export default function TransactionsView({ transactions, totalCount, accounts, filters }: TransactionsViewProps) {
  const t = createTranslator();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      const currentIds = new Set(transactions.map((tx) => tx.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [transactions]);

  const accountOptions: Option[] = useMemo(
    () =>
      accounts.map((account) => ({
        id: account.id,
        name: account.name,
        imageUrl: account.image_url ?? undefined,
        type: account.type ?? undefined,
      })),
    [accounts]
  );

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const maxYear = Math.max(current, filters.year);
    const years = new Set<number>();
    for (let offset = 0; offset < 6; offset += 1) {
      years.add(maxYear - offset);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [filters.year]);

  const visibleTransactions = showSelectedOnly
    ? transactions.filter((transaction) => selectedIds.has(transaction.id))
    : transactions;

  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const allVisibleSelected =
    visibleTransactions.length > 0 && visibleTransactions.every((transaction) => selectedIds.has(transaction.id));

  const updateFilters = (updates: Record<string, string | undefined>, resetPage = true) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    if (resetPage) {
      params.set("page", "1");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleTransactions.forEach((transaction) => next.delete(transaction.id));
      } else {
        visibleTransactions.forEach((transaction) => next.add(transaction.id));
      }
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) {
      return;
    }
    updateFilters({ page: String(nextPage) }, false);
  };

  const handleReset = () => {
    router.push(pathname);
  };

  const monthValue = filters.month === "all" ? "all" : String(filters.month);
  const quarterValue = filters.quarter === "all" ? "all" : String(filters.quarter);

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="year-filter">
              {t("transactions.filters.year")}
            </label>
            <select
              id="year-filter"
              className="rounded-md border-gray-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500"
              value={filters.year}
              onChange={(event) => updateFilters({ year: event.target.value })}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="month-filter">
              {t("transactions.filters.month")}
            </label>
            <select
              id="month-filter"
              className="rounded-md border-gray-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500"
              value={monthValue}
              onChange={(event) => updateFilters({ month: event.target.value })}
            >
              <option value="all">{t("transactions.tabs.all")}</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="quarter-filter">
              {t("transactions.filters.quarter")}
            </label>
            <select
              id="quarter-filter"
              className="rounded-md border-gray-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500"
              value={quarterValue}
              onChange={(event) => updateFilters({ quarter: event.target.value })}
            >
              <option value="all">{t("transactions.tabs.all")}</option>
              {quarterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[220px] space-y-2">
            <CustomSelect
              label={t("transactions.filters.account")}
              value={filters.accountId}
              onChange={(value) => updateFilters({ accountId: value === "__add_new__" ? undefined : value })}
              options={accountOptions}
            />
            {filters.accountId && (
              <button
                type="button"
                onClick={() => updateFilters({ accountId: undefined })}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                {t("transactions.filters.allAccounts")}
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="page-size">
              {t("transactions.filters.pageSize")}
            </label>
            <select
              id="page-size"
              className="rounded-md border-gray-300 py-2 px-3 focus:border-indigo-500 focus:ring-indigo-500"
              value={filters.pageSize}
              onChange={(event) => updateFilters({ pageSize: event.target.value })}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="self-end">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {t("transactions.filters.reset")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {natureTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateFilters({ nature: tab.value })}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.nature === tab.value
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={showSelectedOnly}
              onChange={(event) => setShowSelectedOnly(event.target.checked)}
            />
            {t("transactions.filters.showOnlySelected")}
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    aria-label={t("transactions.filters.selectAll")}
                    checked={allVisibleSelected && visibleTransactions.length > 0}
                    onChange={handleSelectAll}
                  />
                </div>
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
                {t("transactions.tableHeaders.date")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
                {t("transactions.tableHeaders.category")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
                {t("transactions.tableHeaders.account")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-700">
                {t("transactions.tableHeaders.notes")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("transactions.tableHeaders.amount")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleTransactions.map((transaction) => {
              const isSelected = selectedIds.has(transaction.id);
              const categoryLabel = transaction.categoryName
                ? transaction.subcategoryName
                  ? `${transaction.categoryName} / ${transaction.subcategoryName}`
                  : transaction.categoryName
                : transaction.subcategoryName ?? "-";

              let accountLabel = "-";
              if (transaction.fromAccount?.name && transaction.toAccount?.name) {
                accountLabel = `${transaction.fromAccount.name} -> ${transaction.toAccount.name}`;
              } else if (transaction.fromAccount?.name || transaction.toAccount?.name) {
                accountLabel = transaction.fromAccount?.name ?? transaction.toAccount?.name ?? "-";
              }

              return (
                <tr key={transaction.id} className={isSelected ? "bg-indigo-50" : undefined}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={isSelected}
                      onChange={() => toggleSelection(transaction.id)}
                      aria-label={`Select transaction ${transaction.id}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(transaction.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{categoryLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-700">{accountLabel}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{transaction.notes ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-800">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <DeleteButton transactionId={transaction.id} />
                  </td>
                </tr>
              );
            })}
            {visibleTransactions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  {t("transactions.emptyState")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <span>
          {t("transactions.pagination.pageLabel")} {filters.page} {t("transactions.pagination.of")} {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page <= 1}
            className="rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("transactions.pagination.previous")}
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page >= totalPages}
            className="rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("transactions.pagination.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

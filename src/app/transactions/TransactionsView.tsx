"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CustomSelect, { Option } from "@/components/forms/CustomSelect";
import { createTranslator } from "@/lib/i18n";
import { deleteTransaction, deleteTransactions } from "./actions";

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

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const numberFormatter = new Intl.NumberFormat("vi-VN");
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: monthFormatter.format(new Date(2000, index, 1)),
}));

const quarterOptions = [1, 2, 3, 4].map((value) => ({ value: String(value), label: `Q${value}` }));

const formatNumber = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return numberFormatter.format(value);
};
const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US");

const amountColorMap: Record<string, string> = {
  EX: "text-red-600",
  IN: "text-green-700",
  TR: "text-blue-600",
};

const PencilIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" />
    <path
      fillRule="evenodd"
      d="M5 6a1 1 0 0 1 1-1h2.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 0 1.414l-5.414 5.414A1 1 0 0 1 8.586 18H7a1 1 0 0 1-1-1V6Z"
      clipRule="evenodd"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
  >
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2h.293l.853 10.235A2 2 0 0 0 7.138 18h5.724a2 2 0 0 0 1.992-1.765L15.707 6H16a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9Zm-1 6a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V8Zm4-1a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Z"
      clipRule="evenodd"
    />
  </svg>
);

type ActionButtonsProps = {
  transactionId: string;
};

function ActionButtons({ transactionId }: ActionButtonsProps) {
  const t = createTranslator();
  const [isPending, startTransition] = useTransition();

  const handleEdit = useCallback(() => {
    alert(t("transactions.actions.editPlaceholder"));
  }, [t]);

  const handleDelete = useCallback(() => {
    const confirmed = confirm(t("delete.confirm"));
    if (!confirmed) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTransaction(transactionId);
      if (result.success) {
        alert(t("delete.success"));
      } else {
        alert(`${t("delete.error")}: ${result.message}`);
      }
    });
  }, [t, transactionId]);

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={handleEdit}
        className="rounded border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700"
        title={t("transactions.actions.editTooltip")}
        aria-label={t("transactions.actions.editTooltip")}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded border border-gray-300 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        title={t("transactions.actions.deleteTooltip")}
        aria-label={t("transactions.actions.deleteTooltip")}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

type DeleteSelectedButtonProps = {
  selectedIds: string[];
  onDeleted: () => void;
};

function DeleteSelectedButton({ selectedIds, onDeleted }: DeleteSelectedButtonProps) {
  const t = createTranslator();
  const [isPending, startTransition] = useTransition();

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.length === 0) {
      return;
    }
    const confirmed = confirm(t("transactions.actions.deleteSelectedConfirm"));
    if (!confirmed) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTransactions(selectedIds);
      if (result.success) {
        alert(t("transactions.actions.deleteSelectedSuccess"));
        onDeleted();
      } else {
        alert(`${t("delete.error")}: ${result.message}`);
      }
    });
  }, [selectedIds, t, onDeleted]);

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleBulkDelete}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <TrashIcon />
      <span>
        {t("transactions.actions.deleteSelected")}
        {` (${selectedIds.length})`}
      </span>
    </button>
  );
}

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
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
  };

  const monthValue = filters.month === "all" ? "all" : String(filters.month);
  const quarterValue = filters.quarter === "all" ? "all" : String(filters.quarter);
  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedTransactions = useMemo(
    () => transactions.filter((transaction) => selectedIds.has(transaction.id)),
    [transactions, selectedIds]
  );
  const selectedSummary = useMemo(() => {
    if (selectedTransactions.length === 0) {
      return null;
    }
    return selectedTransactions.reduce(
      (acc, transaction) => {
        acc.amount += transaction.amount ?? 0;
        acc.finalPrice += transaction.finalPrice ?? transaction.amount ?? 0;
        acc.cashbackAmount += transaction.cashbackAmount ?? 0;
        return acc;
      },
      { amount: 0, finalPrice: 0, cashbackAmount: 0 }
    );
  }, [selectedTransactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
  }, []);

  const formatBack = useCallback((percent: number | null, amount: number | null) => {
    if (percent == null && amount == null) {
      return "-";
    }
    const parts: string[] = [];
    if (percent != null) {
      parts.push(`${percent}%`);
    }
    if (amount != null) {
      parts.push(formatNumber(amount));
    }
    return parts.join(" • ");
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="space-y-6 p-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="year-filter">
                {t("transactions.filters.year")}
              </label>
              <select
                id="year-filter"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="month-filter">
                {t("transactions.filters.month")}
              </label>
              <select
                id="month-filter"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="quarter-filter">
                {t("transactions.filters.quarter")}
              </label>
              <select
                id="quarter-filter"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

            <div className="flex flex-col gap-2 xl:col-span-2">
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
                  className="self-start text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  {t("transactions.filters.allAccounts")}
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="page-size">
                {t("transactions.filters.pageSize")}
              </label>
              <select
                id="page-size"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
              >
                {t("transactions.filters.reset")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3">
            <div className="flex flex-wrap gap-2">
              {natureTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => updateFilters({ nature: tab.value })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    filters.nature === tab.value
                      ? "border-indigo-500 bg-indigo-600 text-white shadow"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <DeleteSelectedButton selectedIds={selectedIdsArray} onDeleted={clearSelection} />
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

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label={t("transactions.filters.selectAll")}
                  checked={allVisibleSelected && visibleTransactions.length > 0}
                  onChange={handleSelectAll}
                />
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
                {t("transactions.tableHeaders.finalPrice")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("transactions.tableHeaders.cashback")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("transactions.tableHeaders.totalBack")}
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
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

              const natureClass = amountColorMap[transaction.transactionNature ?? ""] ?? "text-gray-800";

              return (
                <tr
                  key={transaction.id}
                  className={`border-b border-gray-200 ${isSelected ? "bg-indigo-50" : "bg-white"}`}
                >
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
                  <td className="max-w-xs px-4 py-3 text-gray-500">{transaction.notes ?? "-"}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${natureClass}`}>
                    {formatNumber(transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-800">
                    {formatNumber(transaction.finalPrice ?? transaction.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                    {formatBack(transaction.cashbackPercent, transaction.cashbackAmount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-indigo-700">
                    {transaction.cashbackAmount != null ? formatNumber(transaction.cashbackAmount) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <ActionButtons transactionId={transaction.id} />
                  </td>
                </tr>
              );
            })}
            {selectedSummary && (
              <tr className="bg-indigo-50 font-semibold text-indigo-900">
                <td className="px-4 py-3" />
                <td className="px-4 py-3" colSpan={4}>
                  {t("transactions.summary.selectedTotals")} ({selectedTransactions.length})
                </td>
                <td className="px-4 py-3 text-right">{formatNumber(selectedSummary.amount)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(selectedSummary.finalPrice)}</td>
                <td className="px-4 py-3 text-right">{t("transactions.summary.mixedBack")}</td>
                <td className="px-4 py-3 text-right">{formatNumber(selectedSummary.cashbackAmount)}</td>
                <td className="px-4 py-3" />
              </tr>
            )}
            {visibleTransactions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={10}>
                  {t("transactions.emptyState")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <span>
          {t("transactions.pagination.pageLabel")} {filters.page} {t("transactions.pagination.of")} {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page <= 1}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("transactions.pagination.previous")}
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page >= totalPages}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("transactions.pagination.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

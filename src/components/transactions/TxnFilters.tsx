"use client";

import { useEffect, useMemo, useState } from "react";

import { createTranslator } from "@/lib/i18n";
import type { BasicOption, CategoryOption, TransactionNature } from "@/lib/transactions";

export type TxnNatureFilter = TransactionNature | "ALL";

export type TxnFilterState = {
  nature: TxnNatureFilter;
  search: string;
  quickRange: 7 | 30 | 90 | null;
  dateFrom: string | null;
  dateTo: string | null;
  accountId: string | null;
  categoryId: string | null;
  status: string | null;
};

type TxnFiltersProps = {
  filters: TxnFilterState;
  accounts: BasicOption[];
  categories: CategoryOption[];
  statuses: string[];
  onChange: (patch: Partial<TxnFilterState>) => void;
  onReset: () => void;
};

const quickRanges: Array<{ value: 7 | 30 | 90; labelKey: keyof typeof QUICK_RANGE_LABELS }> = [
  { value: 7, labelKey: "seven" },
  { value: 30, labelKey: "thirty" },
  { value: 90, labelKey: "ninety" },
];

const QUICK_RANGE_LABELS = {
  seven: "transactions.filters.quickRanges.seven",
  thirty: "transactions.filters.quickRanges.thirty",
  ninety: "transactions.filters.quickRanges.ninety",
} as const;

const natureTabs: Array<{ value: TxnNatureFilter; label: string }> = [
  { value: "ALL", label: "transactions.nature.all" },
  { value: "IN", label: "transactions.nature.income" },
  { value: "EX", label: "transactions.nature.expense" },
  { value: "TF", label: "transactions.nature.transfer" },
  { value: "DEBT", label: "transactions.nature.debt" },
];

export default function TxnFilters({
  filters,
  accounts,
  categories,
  statuses,
  onChange,
  onReset,
}: TxnFiltersProps) {
  const t = useMemo(() => createTranslator(), []);
  const [searchValue, setSearchValue] = useState(filters.search);

  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChange({ search: searchValue });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchValue, onChange]);

  const handleNatureChange = (value: TxnNatureFilter) => {
    onChange({ nature: value });
  };

  const handleQuickRange = (value: 7 | 30 | 90) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - (value - 1));

    const format = (date: Date) => date.toISOString().slice(0, 10);
    onChange({
      quickRange: value,
      dateFrom: format(start),
      dateTo: format(end),
    });
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", value: string) => {
    onChange({
      [key]: value ? value : null,
      quickRange: null,
    });
  };

  const currentQuick = filters.quickRange;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("transactions.filters.sectionTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {natureTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleNatureChange(tab.value)}
              className={`rounded-full px-4 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                filters.nature === tab.value
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t(tab.label as never)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">
            {t("transactions.filters.search")}
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.timeRange")}</span>
          <div className="flex flex-wrap gap-2">
            {quickRanges.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => handleQuickRange(range.value)}
                className={`rounded-lg border px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  currentQuick === range.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {t(QUICK_RANGE_LABELS[range.labelKey] as never)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.dateFrom")}</span>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(event) => handleDateChange("dateFrom", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.dateTo")}</span>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(event) => handleDateChange("dateTo", event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.account")}</span>
          <select
            value={filters.accountId ?? ""}
            onChange={(event) => onChange({ accountId: event.target.value || null })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">{t("transactions.filters.allAccounts")}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.category")}</span>
          <select
            value={filters.categoryId ?? ""}
            onChange={(event) => onChange({ categoryId: event.target.value || null })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">{t("transactions.filters.allTags")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-600">{t("transactions.filters.status")}</span>
          <select
            value={filters.status ?? ""}
            onChange={(event) => onChange({ status: event.target.value || null })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">{t("transactions.filters.reset")}</option>
            {statuses.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {filters.search
            ? `${t("transactions.filters.search")}: ${filters.search}`
            : t("transactions.filters.quickRange")}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          {t("transactions.filters.clearAll")}
        </button>
      </div>
    </section>
  );
}

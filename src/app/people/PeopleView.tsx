"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CustomSelect from "@/components/forms/CustomSelect";
import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { createTranslator } from "@/lib/i18n";

import type { TransactionFilters, AccountRecord } from "@/app/transactions/types";
import type { PersonAggregate } from "./types";

type PeopleViewProps = {
  people: PersonAggregate[];
  filters: TransactionFilters;
  accounts: AccountRecord[];
  errorMessage?: string;
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

const natureTabPalette: Record<
  TransactionFilters["nature"],
  { active: string; inactive: string }
> = {
  all: {
    active: "border-slate-900 bg-slate-900 text-white shadow",
    inactive: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  },
  income: {
    active: "border-emerald-600 bg-emerald-500 text-white shadow",
    inactive: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  expense: {
    active: "border-rose-600 bg-rose-500 text-white shadow",
    inactive: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
  transfer: {
    active: "border-sky-600 bg-sky-500 text-white shadow",
    inactive: "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
};

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: monthFormatter.format(new Date(2000, index, 1)),
}));

const quarterOptions = [1, 2, 3, 4].map((value) => ({ value: String(value), label: `Q${value}` }));

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatCurrency = (value: number) => numberFormatter.format(Math.round(value));

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const ViewToggle = ({
  active,
  onChange,
  labels,
}: {
  active: "list" | "cards";
  onChange: (value: "list" | "cards") => void;
  labels: { list: string; cards: string };
}) => {
  const options: { value: "list" | "cards"; label: string }[] = [
    { value: "list", label: labels.list },
    { value: "cards", label: labels.cards },
  ];

  return (
    <div className="inline-flex rounded-md border border-gray-300 bg-white p-1 shadow-sm">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-indigo-600 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default function PeopleView({ people, filters, accounts, errorMessage }: PeopleViewProps) {
  const t = createTranslator();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.searchTerm);
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isNavigating) {
      setShowLoading(true);
    } else {
      timeout = setTimeout(() => setShowLoading(false), 200);
    }
    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isNavigating]);

  useEffect(() => {
    setSearchValue(filters.searchTerm);
  }, [filters.searchTerm]);

  const accountOptions = useMemo(() => {
    return accounts.map((account) => ({
      value: account.id,
      label: account.name,
    }));
  }, [accounts]);

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
          if (value == null || value === "") {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        });

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  useEffect(() => {
    if (searchValue === filters.searchTerm) {
      return;
    }
    const timeout = setTimeout(() => {
      const trimmed = searchValue.trim();
      updateFilters({ search: trimmed || undefined });
    }, 400);
    return () => clearTimeout(timeout);
  }, [filters.searchTerm, searchValue, updateFilters]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const maxYear = Math.max(current, filters.year);
    const years = new Set<number>();
    for (let offset = 0; offset < 6; offset += 1) {
      years.add(maxYear - offset);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [filters.year]);

  const defaultTemporalValues = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    return {
      year: today.getFullYear(),
      month,
      quarter: Math.floor((month - 1) / 3) + 1,
    };
  }, []);

  const monthValue = filters.month === "all" ? "all" : String(filters.month);
  const quarterValue = filters.quarter === "all" ? "all" : String(filters.quarter);

  const isResetDisabled = useMemo(() => {
    const isMonthDefault = typeof filters.month === "number" && filters.month === defaultTemporalValues.month;
    const isQuarterDefault = typeof filters.quarter === "number" && filters.quarter === defaultTemporalValues.quarter;

    return (
      filters.nature === "all" &&
      filters.year === defaultTemporalValues.year &&
      isMonthDefault &&
      isQuarterDefault &&
      !filters.accountId &&
      !filters.personId &&
      filters.searchTerm.trim() === ""
    );
  }, [defaultTemporalValues, filters.accountId, filters.month, filters.nature, filters.personId, filters.quarter, filters.searchTerm, filters.year]);

  const handleReset = useCallback(() => {
    if (isResetDisabled) {
      return;
    }
    const shouldReset = confirm(t("transactions.filters.resetConfirm"));
    if (!shouldReset) {
      return;
    }
    startTransition(() => {
      router.push(pathname);
    });
  }, [isResetDisabled, pathname, router, startTransition, t]);

  const activePerson = useMemo(() => {
    if (!filters.personId) {
      return null;
    }
    return people.find((person) => person.id === filters.personId) ?? null;
  }, [filters.personId, people]);

  const totalPeople = people.length;
  const totalTransactions = useMemo(() => {
    return people.reduce((acc, person) => acc + person.totalTransactions, 0);
  }, [people]);

  return (
    <div className="relative">
      {showLoading && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            {t("transactions.loadingMessage")}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setFiltersExpanded((prev) => !prev)}
            aria-expanded={filtersExpanded}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                {filtersExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </span>
              {t("transactions.filters.sectionTitle")}
            </span>
            <span className="text-xs font-medium text-indigo-600">
              {filtersExpanded ? t("transactions.filters.collapseButton") : t("transactions.filters.expandButton")}
            </span>
          </button>
          {filtersExpanded && (
            <div className="space-y-5 border-t border-gray-200 p-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="people-year-filter">
                    {t("transactions.filters.year")}
                  </label>
                  <select
                    id="people-year-filter"
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
                  <label className="block text-sm font-medium text-gray-700" htmlFor="people-month-filter">
                    {t("transactions.filters.month")}
                  </label>
                  <select
                    id="people-month-filter"
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
                  <label className="block text-sm font-medium text-gray-700" htmlFor="people-quarter-filter">
                    {t("transactions.filters.quarter")}
                  </label>
                  <select
                    id="people-quarter-filter"
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
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-col gap-2 md:flex-1">
                    <CustomSelect
                      label={t("transactions.filters.account")}
                      value={filters.accountId}
                      onChange={(value) => updateFilters({ accountId: value === "__add_new__" ? undefined : value })}
                      options={accountOptions}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 md:justify-end">
                    {filters.accountId && (
                      <button
                        type="button"
                        onClick={() => updateFilters({ accountId: undefined })}
                        className="text-xs font-semibold uppercase tracking-wide text-indigo-600 transition hover:text-indigo-800"
                      >
                        {t("transactions.filters.allAccounts")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className={`w-full rounded-md px-3 py-2 text-sm font-medium shadow-sm transition md:w-auto ${
                        isResetDisabled
                          ? "border border-gray-200 bg-gray-100 text-gray-400"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                      disabled={isResetDisabled}
                    >
                      {t("transactions.filters.reset")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {errorMessage && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
          )}

          <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {natureTabs.map((tab) => {
                    const palette = natureTabPalette[tab.value];
                    const isActive = filters.nature === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => updateFilters({ nature: tab.value })}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                          isActive ? palette.active : palette.inactive
                        }`}
                      >
                        {t(tab.labelKey)}
                      </button>
                    );
                  })}
                </div>
                {filters.personId && activePerson && (
                  <button
                    type="button"
                    onClick={() => updateFilters({ personId: undefined })}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                  >
                    <span>
                      {t("transactions.filters.personFilter")}: {activePerson.name}
                    </span>
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
              <div className="w-full max-w-xs flex-1 md:max-w-sm md:flex-none">
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={t("common.searchPlaceholder")}
                  aria-label={t("common.searchPlaceholder")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Tooltip label={t("people.addMockTooltip")}>
                  <button
                    type="button"
                    onClick={() => alert(t("people.addMockAlert"))}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    {t("people.addButton")}
                  </button>
                </Tooltip>
                <ViewToggle
                  active={viewMode}
                  onChange={setViewMode}
                  labels={{ list: t("people.views.list"), cards: t("people.views.cards") }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span>
                  {t("people.summary.countLabel")}: {totalPeople}
                </span>
                <span>
                  {t("people.summary.transactionLabel")}: {totalTransactions}
                </span>
              </div>
            </div>
          </div>

          {people.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">{t("people.emptyState")}</div>
          ) : viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">{t("people.tableHeaders.person")}</th>
                    <th className="border-l border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                      {t("people.tableHeaders.transactions")}
                    </th>
                    <th className="border-l border-gray-200 px-4 py-3 text-right font-medium text-gray-700">
                      {t("people.tableHeaders.totalAmount")}
                    </th>
                    <th className="border-l border-gray-200 px-4 py-3 text-right font-medium text-gray-700">
                      {t("people.tableHeaders.totalBack")}
                    </th>
                    <th className="border-l border-gray-200 px-4 py-3 text-right font-medium text-gray-700">
                      {t("people.tableHeaders.finalPrice")}
                    </th>
                    <th className="border-l border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                      {t("people.tableHeaders.lastActivity")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const isActive = filters.personId === person.id;
                    const rowBackground = isActive ? "bg-indigo-50" : "bg-white";
                    return (
                      <tr key={person.id} className={`border-b border-gray-200 ${rowBackground}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {person.imageUrl ? (
                              <RemoteImage
                                src={person.imageUrl}
                                alt={person.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700">
                                {getInitials(person.name)}
                              </span>
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{person.name}</p>
                              <Link
                                href={`/transactions?personId=${encodeURIComponent(person.id)}`}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                              >
                                {t("people.tableHeaders.viewTransactions")}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="border-l border-gray-200 px-4 py-3 text-left text-gray-700">{person.totalTransactions}</td>
                        <td className="border-l border-gray-200 px-4 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(person.totalAmount)}
                        </td>
                        <td className="border-l border-gray-200 px-4 py-3 text-right font-semibold text-indigo-700">
                          {formatCurrency(person.totalBack)}
                        </td>
                        <td className="border-l border-gray-200 px-4 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(person.totalFinalPrice)}
                        </td>
                        <td className="border-l border-gray-200 px-4 py-3 text-gray-600">
                          {person.lastTransactionDate
                            ? new Date(person.lastTransactionDate).toLocaleDateString()
                            : t("people.tableHeaders.noActivity")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-4 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((person) => {
                const isActive = filters.personId === person.id;
                return (
                  <div
                    key={person.id}
                    className={`flex flex-col gap-4 rounded-lg border p-4 shadow-sm transition hover:shadow-md ${
                      isActive ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {person.imageUrl ? (
                        <RemoteImage
                          src={person.imageUrl}
                          alt={person.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold uppercase text-indigo-700">
                          {getInitials(person.name)}
                        </span>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
                        <p className="text-xs text-gray-500">
                          {t("people.tableHeaders.transactions")}: {person.totalTransactions}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>{t("people.tableHeaders.totalAmount")}</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(person.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("people.tableHeaders.totalBack")}</span>
                        <span className="font-semibold text-indigo-700">{formatCurrency(person.totalBack)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("people.tableHeaders.finalPrice")}</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(person.totalFinalPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{t("people.tableHeaders.lastActivity")}</span>
                        <span>
                          {person.lastTransactionDate
                            ? new Date(person.lastTransactionDate).toLocaleDateString()
                            : t("people.tableHeaders.noActivity")}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/transactions?personId=${encodeURIComponent(person.id)}`}
                      className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                    >
                      {t("people.actions.viewTransactions")}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
    <path d="M5 8.5 10 13l5-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
    <path d="M5 11.5 10 7l5 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

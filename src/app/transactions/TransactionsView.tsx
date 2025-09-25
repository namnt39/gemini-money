"use client";

import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CustomSelect, { Option } from "@/components/forms/CustomSelect";
import Tooltip from "@/components/Tooltip";
import { createTranslator } from "@/lib/i18n";
import { numberToVietnameseWords } from "@/lib/numberToVietnameseWords";
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

type DataColumnId =
  | "date"
  | "category"
  | "fromAccount"
  | "toAccount"
  | "notes"
  | "amount"
  | "borrower"
  | "totalBack"
  | "finalPrice";

const DEFAULT_COLUMN_ORDER: DataColumnId[] = [
  "date",
  "category",
  "fromAccount",
  "toAccount",
  "notes",
  "amount",
  "borrower",
  "totalBack",
  "finalPrice",
];

const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 140;
const DEFAULT_COLUMN_WIDTHS: Partial<Record<DataColumnId, number>> = {
  notes: 260,
  amount: 180,
  borrower: 200,
  totalBack: 180,
  finalPrice: 180,
};

type SelectedSummary = {
  amount: number;
  finalPrice: number;
  cashbackAmount: number;
  count: number;
};

type DataColumn = {
  id: DataColumnId;
  label: string;
  minWidth?: number;
  align?: "left" | "right";
  render: (transaction: TransactionListItem) => ReactNode;
  summary?: (summary: SelectedSummary) => ReactNode;
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
      <Tooltip label={t("transactions.actions.editTooltip")}>
        <button
          type="button"
          onClick={handleEdit}
          className="rounded border border-gray-300 bg-white p-2 text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          aria-label={t("transactions.actions.editTooltip")}
        >
          <PencilIcon />
        </button>
      </Tooltip>
      <Tooltip label={t("transactions.actions.deleteTooltip")}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded border border-gray-300 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={t("transactions.actions.deleteTooltip")}
        >
          <TrashIcon />
        </button>
      </Tooltip>
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
  const [isNavigating, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [isCustomizingTable, setIsCustomizingTable] = useState(false);
  const [columnOrder, setColumnOrder] = useState<DataColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<DataColumnId, number>>>(() => ({}));
  const dragColumnIdRef = useRef<DataColumnId | null>(null);
  const resizeInfoRef = useRef<{ columnId: DataColumnId; startX: number; startWidth: number } | null>(null);
  const [resetHighlighted, setResetHighlighted] = useState(false);
  const resetHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const amountWordsMap = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((transaction) => {
      const words = numberToVietnameseWords(transaction.amount ?? 0);
      map.set(transaction.id, words);
    });
    return map;
  }, [transactions]);

  const dataColumns = useMemo<DataColumn[]>(
    () => [
      {
        id: "date",
        label: t("transactions.tableHeaders.date"),
        minWidth: 160,
        render: (transaction) => <span className="text-gray-700">{formatDate(transaction.date)}</span>,
      },
      {
        id: "category",
        label: t("transactions.tableHeaders.category"),
        minWidth: 200,
        render: (transaction) => {
          const categoryLabel = transaction.categoryName
            ? transaction.subcategoryName
              ? `${transaction.categoryName} / ${transaction.subcategoryName}`
              : transaction.categoryName
            : transaction.subcategoryName ?? "-";
          const value = categoryLabel && categoryLabel.trim() !== "" ? categoryLabel : "-";
          const tone = value === "-" ? "text-gray-400" : "text-gray-700";
          return <span className={tone}>{value}</span>;
        },
      },
      {
        id: "fromAccount",
        label: t("transactions.tableHeaders.accountSource"),
        minWidth: 180,
        render: (transaction) => (
          <span className={transaction.fromAccount?.name ? "text-gray-700" : "text-gray-400"}>
            {transaction.fromAccount?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "toAccount",
        label: t("transactions.tableHeaders.accountTarget"),
        minWidth: 180,
        render: (transaction) => (
          <span className={transaction.toAccount?.name ? "text-gray-700" : "text-gray-400"}>
            {transaction.toAccount?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "notes",
        label: t("transactions.tableHeaders.notes"),
        minWidth: 240,
        render: (transaction) => (
          <span className="block max-w-xs truncate text-gray-500">{transaction.notes ?? "-"}</span>
        ),
      },
      {
        id: "amount",
        label: t("transactions.tableHeaders.amount"),
        minWidth: 200,
        align: "right",
        render: (transaction) => {
          const words = amountWordsMap.get(transaction.id) ?? "";
          const natureClass = amountColorMap[transaction.transactionNature ?? ""] ?? "text-gray-800";
          return (
            <div className={`space-y-1 text-right ${natureClass}`}>
              <div className="font-semibold">{formatNumber(transaction.amount)}</div>
              {words ? <div className="text-xs font-normal text-gray-500">{words}</div> : null}
            </div>
          );
        },
        summary: (summary) => formatNumber(summary.amount),
      },
      {
        id: "borrower",
        label: t("transactions.tableHeaders.borrower"),
        minWidth: 180,
        render: (transaction) => (
          <span className={transaction.person?.name ? "text-gray-700" : "text-gray-400"}>
            {transaction.person?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "totalBack",
        label: t("transactions.tableHeaders.totalBack"),
        minWidth: 180,
        align: "right",
        render: (transaction) => (
          <span className="font-medium text-indigo-700">
            {transaction.cashbackAmount != null ? formatNumber(transaction.cashbackAmount) : "-"}
          </span>
        ),
        summary: (summary) => formatNumber(summary.cashbackAmount),
      },
      {
        id: "finalPrice",
        label: t("transactions.tableHeaders.finalPrice"),
        minWidth: 180,
        align: "right",
        render: (transaction) => (
          <span className="font-medium text-gray-800">
            {formatNumber(transaction.finalPrice ?? transaction.amount)}
          </span>
        ),
        summary: (summary) => formatNumber(summary.finalPrice),
      },
    ],
    [amountWordsMap, t]
  );

  const columnConfigById = useMemo(() => {
    const map = new Map<DataColumnId, DataColumn>();
    dataColumns.forEach((column) => {
      map.set(column.id, column);
    });
    return map;
  }, [dataColumns]);

  useEffect(() => {
    const availableIds = dataColumns.map((column) => column.id);
    setColumnOrder((prev) => {
      const filtered = prev.filter((id) => availableIds.includes(id));
      const missing = availableIds.filter((id) => !filtered.includes(id));
      const next = [...filtered, ...missing];
      if (next.length !== prev.length || missing.length > 0) {
        return next;
      }
      return prev;
    });
    setColumnWidths((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!availableIds.includes(key as DataColumnId)) {
          delete next[key as DataColumnId];
        }
      });
      return next;
    });
  }, [dataColumns]);

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((id) => columnConfigById.get(id))
        .filter((column): column is DataColumn => Boolean(column)),
    [columnConfigById, columnOrder]
  );

  const handleResizeMove = useCallback((event: MouseEvent) => {
    const info = resizeInfoRef.current;
    if (!info) {
      return;
    }
    const delta = event.clientX - info.startX;
    const nextWidth = Math.max(MIN_COLUMN_WIDTH, info.startWidth + delta);
    setColumnWidths((prev) => ({ ...prev, [info.columnId]: nextWidth }));
  }, []);

  const handleResizeStop = useCallback(() => {
    resizeInfoRef.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeStop);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLSpanElement>, columnId: DataColumnId) => {
      if (!isCustomizingTable) {
        return;
      }
      event.preventDefault();
      const headerCell = (event.currentTarget.parentElement as HTMLElement) ?? null;
      const startWidth = headerCell ? headerCell.offsetWidth : DEFAULT_COLUMN_WIDTH;
      resizeInfoRef.current = {
        columnId,
        startX: event.clientX,
        startWidth,
      };
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeStop);
    },
    [handleResizeMove, handleResizeStop, isCustomizingTable]
  );

  useEffect(() => {
    return () => {
      handleResizeStop();
    };
  }, [handleResizeStop]);

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLTableCellElement>, columnId: DataColumnId) => {
      if (!isCustomizingTable) {
        return;
      }
      dragColumnIdRef.current = columnId;
      event.dataTransfer.effectAllowed = "move";
    },
    [isCustomizingTable]
  );

  const handleDragOver = useCallback(
    (event: ReactDragEvent<HTMLTableCellElement>) => {
      if (!isCustomizingTable) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [isCustomizingTable]
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLTableCellElement>, targetColumnId: DataColumnId) => {
      if (!isCustomizingTable) {
        return;
      }
      event.preventDefault();
      const sourceColumnId = dragColumnIdRef.current;
      dragColumnIdRef.current = null;
      if (!sourceColumnId || sourceColumnId === targetColumnId) {
        return;
      }
      setColumnOrder((prev) => {
        const next = [...prev];
        const sourceIndex = next.indexOf(sourceColumnId);
        const targetIndex = next.indexOf(targetColumnId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return prev;
        }
        next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, sourceColumnId);
        return next;
      });
    },
    [isCustomizingTable]
  );

  const handleDragEnd = useCallback(() => {
    dragColumnIdRef.current = null;
  }, []);

  const toggleCustomization = useCallback(() => {
    setIsCustomizingTable((prev) => !prev);
  }, []);

  const handleResetLayout = useCallback(() => {
    const shouldReset = confirm(t("transactions.table.resetConfirm"));
    if (!shouldReset) {
      return;
    }
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    setColumnWidths(() => ({}));
  }, [t]);

  const getColumnWidth = useCallback(
    (column: DataColumn) => {
      const preferred = columnWidths[column.id];
      if (preferred != null) {
        return preferred;
      }
      const preset = DEFAULT_COLUMN_WIDTHS[column.id];
      if (preset != null) {
        return preset;
      }
      return Math.max(column.minWidth ?? MIN_COLUMN_WIDTH, DEFAULT_COLUMN_WIDTH);
    },
    [columnWidths]
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

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      startTransition(() => {
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
      });
    },
    [pathname, router, searchParams, startTransition]
  );

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

  const handleReset = useCallback(() => {
    const shouldReset = confirm(t("transactions.filters.resetConfirm"));
    if (!shouldReset) {
      return;
    }
    if (resetHighlightTimeoutRef.current) {
      clearTimeout(resetHighlightTimeoutRef.current);
    }
    setResetHighlighted(true);
    startTransition(() => {
      router.push(pathname);
    });
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
    resetHighlightTimeoutRef.current = setTimeout(() => setResetHighlighted(false), 1500);
  }, [pathname, router, startTransition, t]);

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
    const initial: SelectedSummary = {
      amount: 0,
      finalPrice: 0,
      cashbackAmount: 0,
      count: selectedTransactions.length,
    };
    return selectedTransactions.reduce((acc, transaction) => {
      acc.amount += transaction.amount ?? 0;
      acc.finalPrice += transaction.finalPrice ?? transaction.amount ?? 0;
      acc.cashbackAmount += transaction.cashbackAmount ?? 0;
      return acc;
    }, initial);
  }, [selectedTransactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
  }, []);

  useEffect(() => {
    return () => {
      if (resetHighlightTimeoutRef.current) {
        clearTimeout(resetHighlightTimeoutRef.current);
      }
    };
  }, []);

  const handleDeselectAll = useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }
    const shouldDeselect = confirm(t("transactions.actions.deselectConfirm"));
    if (!shouldDeselect) {
      return;
    }
    clearSelection();
  }, [clearSelection, selectedIds, t]);

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

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="space-y-6 p-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFiltersExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 transition hover:text-indigo-800"
              >
                {filtersExpanded
                  ? t("transactions.filters.collapse")
                  : t("transactions.filters.expand")}
              </button>
            </div>

            {filtersExpanded && (
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
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium shadow-sm transition ${
                      resetHighlighted
                        ? "border border-indigo-500 bg-indigo-600 text-white shadow"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    aria-pressed={resetHighlighted}
                  >
                    {t("transactions.filters.reset")}
                  </button>
                </div>
              </div>
            )}

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
        <div className="flex flex-wrap items-center gap-2">
          <DeleteSelectedButton selectedIds={selectedIdsArray} onDeleted={clearSelection} />
          {selectedIdsArray.length > 0 && (
            <button
              type="button"
              onClick={handleDeselectAll}
              className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              {t("transactions.actions.deselect")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleCustomization}
            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition ${
              isCustomizingTable
                ? "border-indigo-500 bg-indigo-600 text-white shadow"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {isCustomizingTable
              ? t("transactions.table.doneCustomizing")
              : t("transactions.table.customize")}
          </button>
          {isCustomizingTable && (
            <button
              type="button"
              onClick={handleResetLayout}
              className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              {t("transactions.table.resetLayout")}
            </button>
          )}
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

      {isCustomizingTable && (
        <div className="bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-700">
          {t("transactions.table.customizeHint")}
        </div>
      )}

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
              {orderedColumns.map((column) => {
                const width = getColumnWidth(column);
                return (
                  <th
                    key={column.id}
                    className={`px-4 py-3 text-left font-medium text-gray-700 ${
                      isCustomizingTable ? "cursor-move select-none" : ""
                    }`}
                    style={{ width, minWidth: column.minWidth ?? MIN_COLUMN_WIDTH }}
                    draggable={isCustomizingTable}
                    onDragStart={(event) => handleDragStart(event, column.id)}
                    onDragOver={handleDragOver}
                    onDrop={(event) => handleDrop(event, column.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`flex-1 ${column.align === "right" ? "text-right" : ""}`}>
                        {column.label}
                      </span>
                      {isCustomizingTable && (
                        <span
                          role="separator"
                          onMouseDown={(event) => handleResizeStart(event, column.id)}
                          className="h-5 w-1 cursor-col-resize rounded bg-indigo-200"
                        />
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-700">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((transaction) => {
              const isSelected = selectedIds.has(transaction.id);

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
                  {orderedColumns.map((column) => {
                    const width = getColumnWidth(column);
                    const alignClass = column.align === "right" ? "text-right" : "text-left";
                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 ${alignClass}`}
                        style={{ width, minWidth: column.minWidth ?? MIN_COLUMN_WIDTH }}
                      >
                        {column.render(transaction)}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <ActionButtons transactionId={transaction.id} />
                  </td>
                </tr>
              );
            })}
            {selectedSummary && (
              <tr className="bg-indigo-50 font-semibold text-indigo-900">
                <td className="px-4 py-3" />
                {orderedColumns.map((column, index) => {
                  if (column.summary) {
                    const alignClass = column.align === "right" ? "text-right" : "text-left";
                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 ${alignClass}`}
                        style={{ width: getColumnWidth(column), minWidth: column.minWidth ?? MIN_COLUMN_WIDTH }}
                      >
                        {column.summary(selectedSummary)}
                      </td>
                    );
                  }
                  if (index === 0) {
                    return (
                      <td
                        key={column.id}
                        className="px-4 py-3"
                        style={{ width: getColumnWidth(column), minWidth: column.minWidth ?? MIN_COLUMN_WIDTH }}
                      >
                        {t("transactions.summary.selectedTotals")} ({selectedSummary.count})
                      </td>
                    );
                  }
                  return (
                    <td
                      key={column.id}
                      className="px-4 py-3"
                      style={{ width: getColumnWidth(column), minWidth: column.minWidth ?? MIN_COLUMN_WIDTH }}
                    />
                  );
                })}
                <td className="px-4 py-3" />
              </tr>
            )}
            {visibleTransactions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={orderedColumns.length + 2}>
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
    </div>
  );
}

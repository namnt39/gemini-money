"use client";

import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CustomSelect, { Option } from "@/components/forms/CustomSelect";
import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { createTranslator } from "@/lib/i18n";
import { numberToVietnameseWords } from "@/lib/numberToVietnameseWords";
import { formatDateTag, getDateTagSortValue } from "@/lib/dateTag";
import { ClearIcon } from "@/components/Icons";
import { deleteTransaction, deleteTransactions } from "./actions";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "./constants";
import TransactionForm from "./add/TransactionForm";
import type { Account, Subcategory, Person, Shop } from "./add/formData";

import type { AccountRecord, TransactionFilters, TransactionListItem } from "./types";

type TransactionsViewProps = {
  transactions: TransactionListItem[];
  totalCount: number;
  accounts: AccountRecord[];
  filters: TransactionFilters;
  errorMessage?: string;
  formAccounts: Account[];
  formSubcategories: Subcategory[];
  formPeople: Person[];
  formShops: Shop[];
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
  TF: "text-blue-600",
};

const MAX_TOOLTIP_WORDS_PER_LINE = 6;
const TOOLTIP_LINES = 2;

const formatPercentValue = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const fixed = value.toFixed(2);
  const trimmed = fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return `${trimmed}%`;
};

const formatAmountWordsTooltip = (words: string | null | undefined) => {
  if (!words) return "";
  const normalized = words.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const tokens = normalized.split(" ");
  const lines: string[] = [];
  for (let index = 0; index < TOOLTIP_LINES; index += 1) {
    const start = index * MAX_TOOLTIP_WORDS_PER_LINE;
    if (start >= tokens.length) {
      break;
    }
    const end = start + MAX_TOOLTIP_WORDS_PER_LINE;
    lines.push(tokens.slice(start, end).join(" "));
  }
  const ellipsis = tokens.length > MAX_TOOLTIP_WORDS_PER_LINE * TOOLTIP_LINES ? "…" : "";
  return `${lines.join("\n")}${ellipsis}`;
};

const getInitials = (value: string | null | undefined) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

type DataColumnId =
  | "date"
  | "category"
  | "fromAccount"
  | "toAccount"
  | "notes"
  | "amount"
  | "borrower"
  | "transactionTag"
  | "back"
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
  "transactionTag",
  "back",
  "totalBack",
  "finalPrice",
];

const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 140;
const DEFAULT_COLUMN_WIDTHS: Partial<Record<DataColumnId, number>> = {
  notes: 260,
  amount: 180,
  borrower: 200,
  transactionTag: 160,
  back: 200,
  totalBack: 170,
  finalPrice: 180,
};

type SelectedSummary = {
  amount: number;
  finalPrice: number;
  cashbackAmount: number;
  percentPortion: number;
  totalBack: number;
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

type TransactionTagInfo = { value: string; variant: "debt" | "repay" };

type FormTab = "expense" | "income" | "transfer" | "debt";

const computePercentAmount = (amount?: number | null, percent?: number | null) => {
  if (amount == null || percent == null) {
    return null;
  }
  const value = (amount * percent) / 100;
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
};

const buildCashbackDisplay = (transaction: TransactionListItem) => {
  const source = transaction.cashbackSource ?? null;
  const isAmountSource = source === "amount";
  const isPercentSource = source === "percent";

  const effectivePercent = isAmountSource ? null : transaction.cashbackPercent ?? null;
  const percentLabel = formatPercentValue(effectivePercent);
  const hasCashbackAmount = transaction.cashbackAmount != null && !Number.isNaN(transaction.cashbackAmount);

  const percentAmount = !isAmountSource
    ? computePercentAmount(transaction.amount, effectivePercent)
    : null;
  const manualContribution = isPercentSource ? 0 : hasCashbackAmount ? transaction.cashbackAmount ?? 0 : 0;
  const percentContribution = percentAmount ?? 0;
  const amountLineValue = hasCashbackAmount ? transaction.cashbackAmount ?? 0 : 0;

  let totalBackAmount = manualContribution + percentContribution;
  if (isPercentSource && hasCashbackAmount) {
    totalBackAmount = amountLineValue;
  }

  const lines: string[] = [];
  if (percentLabel) {
    lines.push(percentLabel);
  }
  if (hasCashbackAmount) {
    lines.push(formatNumber(amountLineValue));
  }

  return {
    hasData: lines.length > 0,
    lines,
    totalAmount: totalBackAmount,
    percentAmount: percentContribution,
    manualAmount: manualContribution,
  };
};

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path d="M10 4v12M4 10h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircleIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className={`h-4 w-4 ${active ? "text-indigo-600" : "text-gray-400"}`}
  >
    <circle cx="10" cy="10" r="7" strokeOpacity={active ? 1 : 0.6} />
    {active ? <path d="M7.5 10.5 9.5 12.5 12.5 7.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
  </svg>
);

const ColumnsIcon = ({ active }: { active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-5 w-5"
  >
    <rect x="3.5" y="5" width="17" height="14" rx="2" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    <path d="M9 5v14M15 5v14" strokeLinecap="round" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path
      d="M4 4.5v4h4M16 15.5v-4h-4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 14.5A5.5 5.5 0 0 0 16 11l.75-.75M14 5.5A5.5 5.5 0 0 0 4 9l-.75.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ResetFiltersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path d="M5.5 6.5h6a3.5 3.5 0 1 1 0 7H7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 6.5 7.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.5 6.5 7.5 8.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 14.5h-2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PencilIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    className="h-4 w-4"
  >
    <path d="M4 13.5V16h2.5l7.06-7.06a1.5 1.5 0 0 0-2.12-2.12L4 13.5Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 5.5 14 8" strokeLinecap="round" strokeLinejoin="round" />
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
  onEdit: () => void;
};

function ActionButtons({ transactionId, onEdit }: ActionButtonsProps) {
  const t = createTranslator();
  const [isPending, startTransition] = useTransition();

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
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          onDoubleClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
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
          onDoubleClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
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

type NatureHoverMenuItem = NatureTab & { label: string };

type NatureHoverMenuProps = {
  items: NatureHoverMenuItem[];
  activeValue: NatureTab["value"];
  onSelect: (value: NatureTab["value"]) => void;
};

function NatureHoverMenu({ items, activeValue, onSelect }: NatureHoverMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeItem = items.find((item) => item.value === activeValue) ?? items[0];

  useEffect(() => {
    if (!isOpen) {
      return () => undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span>{activeItem?.label}</span>
        <ChevronDownIcon />
      </button>
      <div
        className={`absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg transition ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ul className="py-1 text-sm text-gray-700" role="listbox">
          {items.map((item) => {
            const isActive = item.value === activeValue;
            return (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item.value);
                    setIsOpen(false);
                  }}
                  className={`block w-full px-4 py-2 text-left transition ${
                    isActive ? "bg-indigo-50 font-semibold text-indigo-700" : "hover:bg-indigo-50"
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const TransactionTagBadge = ({ info }: { info: TransactionTagInfo }) => {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
  const tone =
    info.variant === "repay"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border border-rose-200 bg-rose-50 text-rose-700";
  return <span className={`${base} ${tone}`}>{info.value}</span>;
};

export default function TransactionsView({
  transactions,
  totalCount,
  accounts,
  filters,
  errorMessage,
  formAccounts,
  formSubcategories,
  formPeople,
  formShops,
}: TransactionsViewProps) {
  const t = createTranslator();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isCustomizingTable, setIsCustomizingTable] = useState(false);
  const [columnOrder, setColumnOrder] = useState<DataColumnId[]>(DEFAULT_COLUMN_ORDER);
  const [columnWidths, setColumnWidths] = useState<Partial<Record<DataColumnId, number>>>(() => ({}));
  const [showResetLayoutConfirm, setShowResetLayoutConfirm] = useState(false);
  const dragColumnIdRef = useRef<DataColumnId | null>(null);
  const resizeInfoRef = useRef<
    { columnId: DataColumnId; startX: number; startWidth: number; pointerId: number } | null
  >(null);
  const bodyUserSelectRef = useRef<string | null>(null);
  const [resetHighlighted, setResetHighlighted] = useState(false);
  const resetHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.searchTerm);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<FormTab>("expense");
  const [editingTransaction, setEditingTransaction] = useState<TransactionListItem | null>(null);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [debtCycleFilter, setDebtCycleFilter] = useState<string>("all");
  const [debtRepayTagFilter, setDebtRepayTagFilter] = useState<string>("all");
  const defaultTemporalValues = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    return {
      year: now.getFullYear(),
      month,
      quarter: Math.floor((month - 1) / 3) + 1,
    };
  }, []);

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

  const isDebtTransaction = useCallback((transaction: TransactionListItem) => {
    if (!transaction) {
      return false;
    }
    if (transaction.transactionNature === "DE") {
      return true;
    }
    return Boolean(transaction.personId);
  }, []);

  const isRepaymentTransaction = useCallback(
    (transaction: TransactionListItem) => {
      if (!isDebtTransaction(transaction)) {
        return false;
      }
      if (typeof transaction.amount === "number" && transaction.amount < 0) {
        return true;
      }
      if (typeof transaction.finalPrice === "number" && transaction.finalPrice < 0) {
        return true;
      }
      if (transaction.notes) {
        const normalized = transaction.notes.toLowerCase();
        if (normalized.includes("repay") || normalized.includes("thu")) {
          return true;
        }
      }
      return false;
    },
    [isDebtTransaction]
  );

  const debtTagByTransactionId = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((transaction) => {
      const explicit = transaction.debtTag?.trim();
      if (explicit) {
        map.set(transaction.id, explicit);
        return;
      }
      if (isDebtTransaction(transaction)) {
        const fallback = formatDateTag(transaction.date);
        if (fallback) {
          map.set(transaction.id, fallback);
        }
      }
    });
    return map;
  }, [isDebtTransaction, transactions]);

  const repaymentTagByTransactionId = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach((transaction) => {
      const explicit = transaction.debtCycleTag?.trim();
      if (explicit) {
        map.set(transaction.id, explicit);
        return;
      }
      if (isRepaymentTransaction(transaction)) {
        const fallback = formatDateTag(transaction.date);
        if (fallback) {
          map.set(transaction.id, fallback);
        }
      }
    });
    return map;
  }, [isRepaymentTransaction, transactions]);

  const displayTagByTransactionId = useMemo(() => {
    const map = new Map<string, TransactionTagInfo>();
    transactions.forEach((transaction) => {
      const debtTag = debtTagByTransactionId.get(transaction.id) ?? null;
      const repaymentTag = repaymentTagByTransactionId.get(transaction.id) ?? null;
      const isRepayment = isRepaymentTransaction(transaction);
      if (isRepayment && repaymentTag) {
        map.set(transaction.id, { value: repaymentTag, variant: "repay" });
        return;
      }
      if (!isRepayment && debtTag) {
        map.set(transaction.id, { value: debtTag, variant: "debt" });
        return;
      }
      const fallback = formatDateTag(transaction.date);
      if (fallback) {
        map.set(transaction.id, { value: fallback, variant: isRepayment ? "repay" : "debt" });
      }
    });
    return map;
  }, [debtTagByTransactionId, isRepaymentTransaction, repaymentTagByTransactionId, transactions]);

  const sortedTagValues = useMemo(() => {
    const weights = new Map<string, number>();
    const register = (value: string) => {
      const weight = getDateTagSortValue(value);
      const current = weights.get(value);
      if (current == null || weight > current) {
        weights.set(value, weight);
      }
    };
    debtTagByTransactionId.forEach(register);
    repaymentTagByTransactionId.forEach(register);
    displayTagByTransactionId.forEach((info) => register(info.value));
    return Array.from(weights.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([value]) => value);
  }, [debtTagByTransactionId, displayTagByTransactionId, repaymentTagByTransactionId]);

  const debtTagValues = useMemo(() => {
    const unique = new Set<string>();
    debtTagByTransactionId.forEach((value) => unique.add(value));
    return Array.from(unique).sort((a, b) => getDateTagSortValue(b) - getDateTagSortValue(a));
  }, [debtTagByTransactionId]);

  const debtRepayTagValues = useMemo(() => {
    const unique = new Set<string>();
    repaymentTagByTransactionId.forEach((value) => unique.add(value));
    return Array.from(unique).sort((a, b) => getDateTagSortValue(b) - getDateTagSortValue(a));
  }, [repaymentTagByTransactionId]);

  const currentDebtTag = useMemo(() => formatDateTag(new Date()), []);
  const previousDebtTag = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1, 1);
    return formatDateTag(date);
  }, []);

  const tagOptions = useMemo(() => {
    const base: { value: string; label: string; disabled?: boolean }[] = [
      { value: "all", label: t("transactions.filters.allTags") },
    ];

    sortedTagValues.forEach((tag) => {
      base.push({ value: tag, label: tag });
    });

    return base;
  }, [sortedTagValues, t]);

  const debtCycleOptions = useMemo(() => {
    const hasCurrent = currentDebtTag ? debtTagValues.includes(currentDebtTag) : false;
    const hasLast = previousDebtTag ? debtTagValues.includes(previousDebtTag) : false;
    const base: { value: string; label: string; disabled?: boolean }[] = [
      { value: "all", label: t("transactions.filters.allDebtCycles") },
      {
        value: "current",
        label: currentDebtTag
          ? t("transactions.filters.currentDebtCycleWithTag", { tag: currentDebtTag })
          : t("transactions.filters.currentDebtCycle"),
        disabled: !hasCurrent,
      },
      {
        value: "last",
        label: previousDebtTag
          ? t("transactions.filters.lastDebtCycleWithTag", { tag: previousDebtTag })
          : t("transactions.filters.lastDebtCycle"),
        disabled: !hasLast,
      },
    ];

    debtTagValues.forEach((tag) => {
      base.push({ value: `tag:${tag}`, label: t("transactions.filters.cycleOption", { tag }) });
    });

    return base;
  }, [currentDebtTag, debtTagValues, previousDebtTag, t]);

  const debtRepayTagOptions = useMemo(() => {
    const base: { value: string; label: string }[] = [
      { value: "all", label: t("transactions.filters.allRepayments") },
      { value: "none", label: t("transactions.filters.noRepayments") },
    ];
    debtRepayTagValues.forEach((tag) => {
      base.push({ value: tag, label: t("transactions.filters.repayOption", { tag }) });
    });
    return base;
  }, [debtRepayTagValues, t]);

  const natureMenuItems = useMemo(
    () => natureTabs.map((tab) => ({ ...tab, label: t(tab.labelKey) })),
    [t]
  );

  useEffect(() => {
    if (!tagOptions.some((option) => option.value === tagFilter)) {
      setTagFilter("all");
    }
  }, [tagFilter, tagOptions]);

  useEffect(() => {
    if (!debtCycleOptions.some((option) => option.value === debtCycleFilter)) {
      setDebtCycleFilter("all");
    }
  }, [debtCycleFilter, debtCycleOptions]);

  useEffect(() => {
    if (!debtRepayTagOptions.some((option) => option.value === debtRepayTagFilter)) {
      setDebtRepayTagFilter("all");
    }
  }, [debtRepayTagFilter, debtRepayTagOptions]);

  const dataColumns = useMemo<DataColumn[]>(
    () => [
      {
        id: "date",
        label: t("transactions.tableHeaders.date"),
        minWidth: 160,
        render: (transaction) => <span className="block text-gray-700">{formatDate(transaction.date)}</span>,
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
          const tooltipLabel = formatAmountWordsTooltip(words);
          const natureClass = amountColorMap[transaction.transactionNature ?? ""] ?? "text-gray-800";
          const amountContent = (
            <div className={`flex flex-col items-end text-right ${natureClass}`}>
              <span className="font-semibold">{formatNumber(transaction.amount)}</span>
            </div>
          );
          return tooltipLabel ? <Tooltip label={tooltipLabel}>{amountContent}</Tooltip> : amountContent;
        },
        summary: (summary) => (
          <span className="font-semibold text-gray-800">{formatNumber(summary.amount)}</span>
        ),
      },
      {
        id: "borrower",
        label: t("transactions.tableHeaders.borrower"),
        minWidth: 180,
        render: (transaction) => {
          const name = transaction.person?.name?.trim();
          if (!name) {
            return <span className="text-gray-400">-</span>;
          }
          const initials = getInitials(name);
          const avatar = transaction.person?.image_url ? (
            <RemoteImage
              src={transaction.person.image_url}
              alt={name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700">
              {initials || "?"}
            </span>
          );
          return (
            <div className="flex items-center gap-2">
              {avatar}
              <Link
                href={
                  transaction.person?.id
                    ? `/people?personId=${encodeURIComponent(transaction.person.id)}`
                    : "/people"
                }
                className="text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
              >
                {name}
              </Link>
            </div>
          );
        },
      },
      {
        id: "transactionTag",
        label: t("transactions.tableHeaders.transactionTag"),
        minWidth: 160,
        render: (transaction) => {
          const info = displayTagByTransactionId.get(transaction.id);
          if (!info) {
            return <span className="text-gray-400">-</span>;
          }
          return <TransactionTagBadge info={info} />;
        },
      },
      {
        id: "back",
        label: t("transactions.tableHeaders.back"),
        minWidth: 160,
        align: "right",
        render: (transaction) => {
          const { hasData, lines } = buildCashbackDisplay(transaction);
          if (!hasData) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-col items-end text-right">
              {lines.map((line, index) => (
                <span
                  key={`${transaction.id}-back-${index}-${line}`}
                  className={index === 0 ? "font-semibold text-indigo-600" : "text-xs text-gray-500"}
                >
                  {line}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "totalBack",
        label: t("transactions.tableHeaders.totalBack"),
        minWidth: 160,
        align: "right",
        render: (transaction) => {
          const { hasData, totalAmount } = buildCashbackDisplay(transaction);
          if (!hasData) {
            return <span className="text-gray-400">-</span>;
          }
          return (
            <div className="flex flex-col items-end text-right">
              <span className="font-semibold text-indigo-700">{formatNumber(totalAmount)}</span>
            </div>
          );
        },
        summary: (summary) => (
          <span className="font-semibold text-indigo-700">{formatNumber(summary.totalBack)}</span>
        ),
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
    [amountWordsMap, displayTagByTransactionId, t]
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
      let didMutate = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (!availableIds.includes(key as DataColumnId)) {
          delete next[key as DataColumnId];
          didMutate = true;
        }
      });
      return didMutate ? next : prev;
    });
  }, [dataColumns]);

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((id) => columnConfigById.get(id))
        .filter((column): column is DataColumn => Boolean(column)),
    [columnConfigById, columnOrder]
  );

  const handleResizeMove = useCallback((event: PointerEvent) => {
    const info = resizeInfoRef.current;
    if (!info || event.pointerId !== info.pointerId) {
      return;
    }
    const delta = event.clientX - info.startX;
    const nextWidth = Math.max(MIN_COLUMN_WIDTH, info.startWidth + delta);
    setColumnWidths((prev) => ({ ...prev, [info.columnId]: nextWidth }));
  }, []);

  const handleResizeStop = useCallback((event?: PointerEvent) => {
    const info = resizeInfoRef.current;
    if (event && info && event.pointerId !== info.pointerId) {
      return;
    }
    resizeInfoRef.current = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeStop);
      window.removeEventListener("pointercancel", handleResizeStop);
    }
    if (typeof document !== "undefined" && bodyUserSelectRef.current != null) {
      document.body.style.userSelect = bodyUserSelectRef.current;
      bodyUserSelectRef.current = null;
    }
  }, [handleResizeMove]);

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>, columnId: DataColumnId) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      event.preventDefault();
      const headerCell =
        (event.currentTarget.closest("th") as HTMLElement | null) ?? (event.currentTarget.parentElement as HTMLElement | null);
      const startWidth = headerCell ? headerCell.offsetWidth : DEFAULT_COLUMN_WIDTH;
      resizeInfoRef.current = {
        columnId,
        startX: event.clientX,
        startWidth,
        pointerId: event.pointerId,
      };
      if (typeof document !== "undefined") {
        bodyUserSelectRef.current = document.body.style.userSelect;
        document.body.style.userSelect = "none";
      }
      if (typeof window !== "undefined") {
        window.addEventListener("pointermove", handleResizeMove);
        window.addEventListener("pointerup", handleResizeStop);
        window.addEventListener("pointercancel", handleResizeStop);
      }
    },
    [handleResizeMove, handleResizeStop]
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
    setShowResetLayoutConfirm(true);
  }, []);

  const handleConfirmResetLayout = useCallback(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    setColumnWidths(() => ({}));
    setShowResetLayoutConfirm(false);
  }, []);

  const handleCancelResetLayout = useCallback(() => {
    setShowResetLayoutConfirm(false);
  }, []);

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

  const visibleTransactions = useMemo(() => {
    const base = showSelectedOnly
      ? transactions.filter((transaction) => selectedIds.has(transaction.id))
      : transactions;

    return base
      .filter((transaction) => {
        const displayInfo = displayTagByTransactionId.get(transaction.id);
        const debtTag = debtTagByTransactionId.get(transaction.id) ?? null;
        const repaymentTag = repaymentTagByTransactionId.get(transaction.id) ?? null;

        if (
          tagFilter !== "all" &&
          tagFilter !== (displayInfo?.value ?? null) &&
          tagFilter !== debtTag &&
          tagFilter !== repaymentTag
        ) {
          return false;
        }

        if (debtCycleFilter === "current") {
          if (!isDebtTransaction(transaction)) {
            return false;
          }
          if (!currentDebtTag) {
            return false;
          }
          return debtTag === currentDebtTag;
        }

        if (debtCycleFilter === "last") {
          if (!isDebtTransaction(transaction)) {
            return false;
          }
          if (!previousDebtTag) {
            return false;
          }
          return debtTag === previousDebtTag;
        }

        if (debtCycleFilter.startsWith("tag:")) {
          if (!isDebtTransaction(transaction)) {
            return false;
          }
          const target = debtCycleFilter.slice(4);
          return debtTag === target;
        }

        return true;
      })
      .filter((transaction) => {
        if (debtRepayTagFilter === "all") {
          return true;
        }
        const isRepayment = isRepaymentTransaction(transaction);
        if (debtRepayTagFilter === "none") {
          return !isRepayment;
        }
        if (!isRepayment) {
          return false;
        }
        const tag = repaymentTagByTransactionId.get(transaction.id);
        return tag === debtRepayTagFilter;
      });
  }, [
    showSelectedOnly,
    transactions,
    selectedIds,
    displayTagByTransactionId,
    debtTagByTransactionId,
    repaymentTagByTransactionId,
    tagFilter,
    debtCycleFilter,
    isDebtTransaction,
    currentDebtTag,
    previousDebtTag,
    debtRepayTagFilter,
    isRepaymentTransaction,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize));
  const allVisibleSelected =
    visibleTransactions.length > 0 && visibleTransactions.every((transaction) => selectedIds.has(transaction.id));

  const handleOpenAddModal = useCallback(() => {
    let initialTab: FormTab = "expense";
    if (filters.nature === "income") {
      initialTab = "income";
    } else if (filters.nature === "transfer") {
      initialTab = "transfer";
    }
    setModalInitialTab(initialTab);
    setEditingTransaction(null);
    setAddModalOpen(true);
  }, [filters.nature]);

  const handleCloseAddModal = useCallback(() => {
    setAddModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const determineInitialTabFromTransaction = useCallback((transaction: TransactionListItem): FormTab => {
    const nature = transaction.transactionNature ?? null;
    if (nature === "IN") {
      return "income";
    }
    if (nature === "TF") {
      return "transfer";
    }
    if (nature === "DE") {
      return "debt";
    }
    if (transaction.personId) {
      return "debt";
    }
    if (transaction.fromAccountId && transaction.toAccountId) {
      return "transfer";
    }
    if (transaction.toAccountId && !transaction.fromAccountId) {
      return "income";
    }
    return "expense";
  }, []);

  const handleEditTransaction = useCallback(
    (transaction: TransactionListItem) => {
      const initialTab = determineInitialTabFromTransaction(transaction);
      setModalInitialTab(initialTab);
      setEditingTransaction(transaction);
      setAddModalOpen(true);
    },
    [determineInitialTabFromTransaction]
  );

  const currentReturnPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const isResetDisabled = useMemo(() => {
    const isMonthDefault =
      typeof filters.month === "number" && filters.month === defaultTemporalValues.month;
    const isQuarterDefault =
      typeof filters.quarter === "number" && filters.quarter === defaultTemporalValues.quarter;

    return (
      filters.nature === "all" &&
      filters.year === defaultTemporalValues.year &&
      isMonthDefault &&
      isQuarterDefault &&
      !filters.accountId &&
      !filters.personId &&
      filters.searchTerm.trim() === "" &&
      filters.page === 1 &&
      filters.pageSize === DEFAULT_PAGE_SIZE
    );
  }, [
    defaultTemporalValues,
    filters.accountId,
    filters.month,
    filters.nature,
    filters.page,
    filters.pageSize,
    filters.personId,
    filters.quarter,
    filters.searchTerm,
    filters.year,
  ]);

  const resetButtonClasses = useMemo(() => {
    const base = "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm shadow-sm transition";
    const activeState = resetHighlighted
      ? "border-indigo-500 bg-indigo-600 text-white shadow"
      : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700";
    const disabledState = isResetDisabled
      ? "cursor-not-allowed opacity-60 hover:border-gray-300 hover:bg-white hover:text-gray-400"
      : "";
    return `${base} ${activeState} ${disabledState}`.trim();
  }, [isResetDisabled, resetHighlighted]);

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

  useEffect(() => {
    if (searchValue === filters.searchTerm) {
      return;
    }
    const timeout = setTimeout(() => {
      updateFilters({ search: searchValue.trim() ? searchValue.trim() : undefined });
    }, 400);
    return () => clearTimeout(timeout);
  }, [filters.searchTerm, searchValue, updateFilters]);

  const handleSearchClear = useCallback(() => {
    setSearchValue("");
    searchInputRef.current?.focus();
  }, []);

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
    if (isResetDisabled) {
      return;
    }
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
    setTagFilter("all");
    setDebtCycleFilter("all");
    setDebtRepayTagFilter("all");
    setSelectedIds(new Set());
    setShowSelectedOnly(false);
    resetHighlightTimeoutRef.current = setTimeout(() => setResetHighlighted(false), 1500);
  }, [isResetDisabled, pathname, router, startTransition, t]);

  const monthValue = filters.month === "all" ? "all" : String(filters.month);
  const quarterValue = filters.quarter === "all" ? "all" : String(filters.quarter);
  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const shouldShowSelectedToggle = selectedIds.size > 0;
  const selectedTransactions = useMemo(
    () => (selectedIds.size === 0 ? [] : transactions.filter((transaction) => selectedIds.has(transaction.id))),
    [transactions, selectedIds]
  );
  useEffect(() => {
    if (selectedIds.size === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedIds, showSelectedOnly]);
  const activeBorrowerName = useMemo(() => {
    if (!filters.personId) {
      return null;
    }
    const match = transactions.find((transaction) => transaction.person?.id === filters.personId);
    return match?.person?.name ?? null;
  }, [filters.personId, transactions]);
  const selectedSummary = useMemo(() => {
    if (selectedTransactions.length === 0) {
      return null;
    }
    const initial: SelectedSummary = {
      amount: 0,
      finalPrice: 0,
      cashbackAmount: 0,
      percentPortion: 0,
      totalBack: 0,
      count: selectedTransactions.length,
    };
    return selectedTransactions.reduce((acc, transaction) => {
      const amountValue = transaction.amount ?? 0;
      const finalPriceValue = transaction.finalPrice ?? amountValue;
      const breakdown = buildCashbackDisplay(transaction);

      acc.amount += amountValue;
      acc.finalPrice += finalPriceValue;
      acc.cashbackAmount += breakdown.manualAmount;
      acc.percentPortion += breakdown.percentAmount;
      acc.totalBack += breakdown.totalAmount;
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

      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
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
            <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              {filtersExpanded
                ? t("transactions.filters.collapseButton")
                : t("transactions.filters.expandButton")}
            </span>
          </button>
          {filtersExpanded && (
            <div className="space-y-5 border-t border-gray-200 p-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="sm:col-span-2 xl:col-span-1">
                  <CustomSelect
                    label={t("transactions.filters.account")}
                    value={filters.accountId}
                    onChange={(value) => updateFilters({ accountId: value === "__add_new__" ? undefined : value })}
                    options={accountOptions}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="tag-filter">
                    {t("transactions.filters.tagLabel")}
                  </label>
                  <select
                    id="tag-filter"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                  >
                    {tagOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="debt-cycle-filter">
                    {t("transactions.filters.debtCycleLabel")}
                  </label>
                  <select
                    id="debt-cycle-filter"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={debtCycleFilter}
                    onChange={(event) => setDebtCycleFilter(event.target.value)}
                  >
                    {debtCycleOptions.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="debt-repay-filter">
                    {t("transactions.filters.debtRepayLabel")}
                  </label>
                  <select
                    id="debt-repay-filter"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    value={debtRepayTagFilter}
                    onChange={(event) => setDebtRepayTagFilter(event.target.value)}
                  >
                    {debtRepayTagOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 xl:col-span-3 flex justify-end">
                  <Tooltip label={t("transactions.filters.reset")} position="left">
                    <button
                      type="button"
                      onClick={handleReset}
                      className={resetButtonClasses}
                      aria-pressed={resetHighlighted}
                      disabled={isResetDisabled}
                      aria-label={t("transactions.filters.reset")}
                    >
                      <ResetFiltersIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          {errorMessage && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
          )}
          <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 xl:flex-1">
                <Tooltip label={t("transactions.actions.addTooltip")}>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 sm:flex-none"
                  >
                    <PlusIcon />
                    {t("transactions.addButton")}
                  </button>
                </Tooltip>
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="searchbox"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={t("common.searchPlaceholder")}
                    aria-label={t("common.searchPlaceholder")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-16 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {searchValue ? (
                    <div className="absolute inset-y-1.5 right-2 flex items-center">
                      <Tooltip label={t("common.clear")}>
                        <button
                          type="button"
                          onClick={handleSearchClear}
                          className="inline-flex items-center justify-center rounded-md border border-transparent p-2 text-indigo-600 transition hover:border-indigo-100 hover:bg-indigo-50"
                          aria-label={t("common.clear")}
                        >
                          <ClearIcon />
                        </button>
                      </Tooltip>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <NatureHoverMenu
                  items={natureMenuItems}
                  activeValue={filters.nature}
                  onSelect={(value) => updateFilters({ nature: value })}
                />
                <Tooltip
                  label={
                    isCustomizingTable
                      ? t("transactions.table.doneCustomizing")
                      : t("transactions.table.customize")
                  }
                >
                  <button
                    type="button"
                    onClick={toggleCustomization}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                      isCustomizingTable
                        ? "border-indigo-500 bg-indigo-600 text-white shadow"
                        : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                    aria-pressed={isCustomizingTable}
                    aria-label={
                      isCustomizingTable
                        ? t("transactions.table.doneCustomizing")
                        : t("transactions.table.customize")
                    }
                  >
                    <ColumnsIcon active={isCustomizingTable} />
                  </button>
                </Tooltip>
                <Tooltip label={t("transactions.table.resetLayout")}>
                  <button
                    type="button"
                    onClick={handleResetLayout}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    aria-label={t("transactions.table.resetLayout")}
                  >
                    <RefreshIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {filters.personId && (
                <button
                  type="button"
                  onClick={() => updateFilters({ personId: undefined })}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <span>
                    {t("transactions.filters.personFilter")}: {activeBorrowerName ?? t("transactions.filters.unknownPerson")}
                  </span>
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {shouldShowSelectedToggle ? (
                <button
                  type="button"
                  onClick={() => setShowSelectedOnly((prev) => !prev)}
                  className={`${
                    showSelectedOnly
                      ? "inline-flex items-center gap-2 rounded-full border border-indigo-600 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm"
                      : "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                  aria-pressed={showSelectedOnly}
                >
                  <CheckCircleIcon active={showSelectedOnly} />
                  <span>{t("transactions.filters.showOnlySelected")}</span>
                  {selectedIds.size > 0 ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {selectedIds.size}
                    </span>
                  ) : null}
                </button>
              ) : null}
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
          </div>

          {isCustomizingTable && (
            <div className="bg-indigo-50 px-4 py-2 text-xs font-medium text-indigo-700">
              {t("transactions.table.customizeHint")}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm">
              <thead className="bg-gray-100">
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 z-30 border-r border-gray-200 bg-gray-100 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={t("transactions.filters.selectAll")}
                      checked={allVisibleSelected && visibleTransactions.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  {orderedColumns.map((column, index) => {
                    const width = getColumnWidth(column);
                    const borderClass = index === 0 ? "" : "border-l border-gray-200";
                    return (
                      <th
                        key={column.id}
                        className={`relative px-4 py-3 text-left font-medium text-gray-700 ${borderClass} ${
                          isCustomizingTable ? "cursor-move select-none" : ""
                        }`}
                        style={{ width, minWidth: column.minWidth ?? MIN_COLUMN_WIDTH, maxWidth: width }}
                        draggable={isCustomizingTable}
                        onDragStart={(event) => handleDragStart(event, column.id)}
                        onDragOver={handleDragOver}
                        onDrop={(event) => handleDrop(event, column.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <span className={`block ${column.align === "right" ? "text-right" : ""}`}>{column.label}</span>
                        <span
                          role="separator"
                          aria-hidden="true"
                          onPointerDown={(event) => handleResizeStart(event, column.id)}
                          className="group absolute top-0 right-0 flex h-full w-3 translate-x-1/2 cursor-col-resize select-none items-center justify-center"
                        >
                          <span className="h-8 w-px rounded bg-transparent transition group-hover:bg-indigo-400" />
                        </span>
                      </th>
                    );
                  })}
                  <th className="border-l border-gray-200 px-4 py-3 text-right font-medium text-gray-700">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((transaction) => {
                  const isSelected = selectedIds.has(transaction.id);
                  const rowBackgroundClass = isSelected ? "bg-indigo-50" : "bg-white";

                  return (
                    <tr
                      key={transaction.id}
                      className={`border-b border-gray-200 ${rowBackgroundClass} cursor-pointer hover:bg-indigo-50/70`}
                      onDoubleClick={() => handleEditTransaction(transaction)}
                    >
                      <td
                        className={`sticky left-0 z-20 border-r border-gray-200 px-4 py-3 ${rowBackgroundClass}`}
                        onDoubleClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={isSelected}
                          onChange={() => toggleSelection(transaction.id)}
                          aria-label={`Select transaction ${transaction.id}`}
                        />
                      </td>
                      {orderedColumns.map((column, index) => {
                        const width = getColumnWidth(column);
                        const alignClass = column.align === "right" ? "text-right" : "text-left";
                        const borderClass = index === 0 ? "" : "border-l border-gray-200";
                        return (
                          <td
                            key={column.id}
                            className={`px-4 py-3 ${alignClass} ${borderClass}`}
                            style={{ width, minWidth: column.minWidth ?? MIN_COLUMN_WIDTH, maxWidth: width }}
                            onDoubleClick={(event) => event.stopPropagation()}
                          >
                            {column.render(transaction)}
                          </td>
                        );
                      })}
                      <td
                        className="border-l border-gray-200 px-4 py-3 text-right"
                        onDoubleClick={(event) => event.stopPropagation()}
                      >
                        <ActionButtons
                          transactionId={transaction.id}
                          onEdit={() => handleEditTransaction(transaction)}
                        />
                      </td>
                    </tr>
                  );
                })}
                {selectedSummary && (
                  <tr className="bg-indigo-50 font-semibold text-indigo-900">
                    <td className="sticky left-0 z-20 border-r border-indigo-200 bg-indigo-50 px-4 py-3" />
                    {orderedColumns.map((column, index) => {
                      const borderClass = index === 0 ? "" : "border-l border-indigo-200";
                      if (column.summary) {
                        const alignClass = column.align === "right" ? "text-right" : "text-left";
                        return (
                          <td
                            key={column.id}
                            className={`px-4 py-3 ${alignClass} ${borderClass}`}
                            style={{
                              width: getColumnWidth(column),
                              minWidth: column.minWidth ?? MIN_COLUMN_WIDTH,
                              maxWidth: getColumnWidth(column),
                            }}
                          >
                            {column.summary(selectedSummary)}
                          </td>
                        );
                      }
                      if (index === 0) {
                        return (
                          <td
                            key={column.id}
                            className={`px-4 py-3 ${borderClass}`}
                            style={{
                              width: getColumnWidth(column),
                              minWidth: column.minWidth ?? MIN_COLUMN_WIDTH,
                              maxWidth: getColumnWidth(column),
                            }}
                          >
                            {t("transactions.summary.selectedTotals")} ({selectedSummary.count})
                          </td>
                        );
                      }
                      return (
                        <td
                          key={column.id}
                          className={`px-4 py-3 ${borderClass}`}
                          style={{
                            width: getColumnWidth(column),
                            minWidth: column.minWidth ?? MIN_COLUMN_WIDTH,
                            maxWidth: getColumnWidth(column),
                          }}
                        />
                      );
                    })}
                    <td className="border-l border-indigo-200 px-4 py-3" />
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

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <span>
                {t("transactions.pagination.pageLabel")} {filters.page} {t("transactions.pagination.of")} {totalPages}
              </span>
              <div className="flex items-center justify-center gap-3 md:justify-end">
                <Tooltip label={t("transactions.pagination.previous")}> 
                  <button
                    type="button"
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page <= 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("transactions.pagination.previous")}
                  >
                    <ChevronLeftIcon />
                  </button>
                </Tooltip>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    {t("transactions.filters.pageSize")}
                  </span>
                  <select
                    id="page-size"
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    value={filters.pageSize}
                    onChange={(event) => updateFilters({ pageSize: event.target.value })}
                    aria-label={t("transactions.filters.pageSize")}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <Tooltip label={t("transactions.pagination.next")}> 
                  <button
                    type="button"
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= totalPages}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={t("transactions.pagination.next")}
                  >
                    <ChevronRightIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
      </div>
    </div>
    {isAddModalOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
        <div className="absolute inset-0" aria-hidden="true" />
        <div className="relative z-10 flex w-full max-h-[90vh] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <TransactionForm
            accounts={formAccounts}
            subcategories={formSubcategories}
            people={formPeople}
            shops={formShops}
            returnTo={currentReturnPath}
            initialTab={modalInitialTab}
            mode={editingTransaction ? "edit" : "create"}
            initialTransaction={editingTransaction ?? undefined}
            onClose={handleCloseAddModal}
            layout="modal"
          />
        </div>
      </div>
    ) : null}
    <ConfirmDialog
      open={showResetLayoutConfirm}
      title="Reset column layout?"
      description="Restoring the default layout will reset the order and widths of every column in the transaction table."
      cancelLabel="Keep current layout"
      confirmLabel="Reset layout"
      onCancel={handleCancelResetLayout}
      onConfirm={handleConfirmResetLayout}
    />
  </div>
  );
}
const ChevronLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M11.5 5.5 7.5 10l4 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M8.5 5.5 12.5 10l-4 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M5 8.5 10 13l5-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M5 11.5 10 7l5 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


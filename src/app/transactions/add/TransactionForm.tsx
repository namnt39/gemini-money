"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, Subcategory, Person, Shop } from "./formData";
import { createTransaction, updateTransaction } from "../actions";
import AmountInput from "@/components/forms/AmountInput";
import CustomSelect from "@/components/forms/CustomSelect";
import CashbackInput from "@/components/forms/CashbackInput";
import DatePicker from "@/components/forms/DatePicker";
import { createTranslator } from "@/lib/i18n";
import { normalizeTransactionNature, type TransactionNatureCode } from "@/lib/transactionNature";
import { useAppShell } from "@/components/AppShellProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDateTag } from "@/lib/dateTag";
import AddShopModal from "@/components/shops/AddShopModal";
import type { TransactionListItem } from "../types";

type Tab = "expense" | "income" | "transfer" | "debt";
type DebtMode = "collect" | "lend";

type TransactionFormProps = {
  accounts: Account[];
  subcategories: Subcategory[];
  people: Person[];
  shops: Shop[];
  usingMockSubcategories: boolean;
  returnTo: string;
  createdSubcategoryId?: string;
  initialTab?: Tab;
  initialTransaction?: TransactionListItem;
  mode?: "create" | "edit";
  onClose?: () => void;
  layout?: "page" | "modal";
};

type CashbackSource = "percent" | "amount" | null;
type CashbackInfo = { percent: number; amount: number; source: CashbackSource };

type PersistedState = {
  activeTab: Tab;
  amount: string;
  fromAccountId: string;
  toAccountId: string;
  subcategoryId: string;
  personId: string;
  notes: string;
  date: string;
  cashbackPercent: number;
  cashbackAmount: number;
  cashbackSource: CashbackSource;
  debtMode: DebtMode;
  shopId: string;
  debtTag: string;
  debtCycleTag: string;
  useLastMonthTag: boolean;
};

const STORAGE_KEY = "transactions:add-form-state";
const PRESERVE_KEY = `${STORAGE_KEY}:preserve`;

const tabColors: Record<Tab, string> = {
  expense: "bg-red-500",
  income: "bg-green-500",
  transfer: "bg-blue-500",
  debt: "bg-yellow-500",
};

const debtModePalette: Record<DebtMode, { active: string; inactive: string }> = {
  lend: {
    active: "bg-rose-500 text-white shadow",
    inactive: "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
  },
  collect: {
    active: "bg-emerald-500 text-white shadow",
    inactive: "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
  },
};

const TabButton = ({
  title,
  color,
  active,
  onClick,
}: {
  title: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm transition",
      active ? color : "bg-gray-300 hover:bg-gray-400",
    ].join(" ")}
    aria-pressed={active}
  >
    {title}
  </button>
);

const toDateInputValue = (isoLike: string) => {
  try {
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

const mapNatureToTab = (code: TransactionNatureCode | null): Tab | null => {
  if (!code) return null;
  if (code === "EX") return "expense";
  if (code === "IN") return "income";
  if (code === "TF") return "transfer";
  if (code === "DE") return "debt";
  return null;
};

const readStringField = (record: TransactionListItem | null, field: string): string | null => {
  if (!record) {
    return null;
  }
  const value = (record as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value : null;
};

const readNumberField = (record: TransactionListItem | null, field: string): number | null => {
  if (!record) {
    return null;
  }
  const value = (record as Record<string, unknown>)[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const determineTabFromTransactionRecord = (tx: TransactionListItem): Tab => {
  const rawNature = tx.transactionNature ?? readStringField(tx, "transaction_nature");
  const code = normalizeTransactionNature(rawNature ?? null);
  return mapNatureToTab(code) ?? "expense";
};

const extractCashbackInfoFromTransaction = (
  tx: TransactionListItem
): { info: CashbackInfo; show: boolean } => {
  const percentValue =
    (typeof tx.cashbackPercent === "number" && Number.isFinite(tx.cashbackPercent)
      ? tx.cashbackPercent
      : null) ?? readNumberField(tx, "cashback_percent") ?? 0;
  const amountValue =
    (typeof tx.cashbackAmount === "number" && Number.isFinite(tx.cashbackAmount)
      ? tx.cashbackAmount
      : null) ?? readNumberField(tx, "cashback_amount") ?? 0;
  const derivedSource: CashbackSource =
    amountValue > 0 ? "amount" : percentValue > 0 ? "percent" : null;
  return {
    info: { percent: percentValue, amount: amountValue, source: derivedSource },
    show: percentValue > 0 || amountValue > 0,
  };
};

const formatAmountForInput = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  return Math.round(value).toLocaleString("en-US");
};

const resolveDebtModeFromTransaction = (record: TransactionListItem | null): DebtMode => {
  const rawMode =
    (record
      ? readStringField(record, "debtMode") ?? readStringField(record, "debt_mode")
      : null) ?? null;
  return rawMode === "collect" ? "collect" : "lend";
};

export default function TransactionForm({
  accounts,
  subcategories,
  people,
  shops,
  usingMockSubcategories,
  returnTo,
  createdSubcategoryId,
  initialTab,
  initialTransaction,
  mode = "create",
  onClose,
  layout = "page",
}: TransactionFormProps) {
  const t = createTranslator();
  const router = useRouter();
  const { showSuccess, navigate } = useAppShell();

  const isEditMode = mode === "edit";
  const editingTransaction = isEditMode && initialTransaction ? initialTransaction : null;

  // --- restore persisted state (giữ nguyên code gốc) ---
  // ... [giữ nguyên toàn bộ logic state, hook, effects như file bạn đưa] ...

  // Options
  const expenseCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "EX").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const incomeCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "IN").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const accountsWithOptions = useMemo(() => accounts.map(mapToOptions), [accounts, mapToOptions]);
  const bankAccountOptions = useMemo(
    () => accounts.filter((a) => a.type?.toLowerCase() === "bank").map(mapToOptions),
    [accounts, mapToOptions]
  );
  const peopleWithOptions = useMemo(() => people.map(mapToOptions), [people, mapToOptions]);
  const shopOptions = useMemo(() => shopRecords.map(mapToOptions), [mapToOptions, shopRecords]);

  const availableShopTypes = useMemo(() => {
    const unique = new Set<string>();
    shopRecords.forEach((record) => {
      const typeValue = record.type ?? null;
      if (typeValue && typeValue.trim()) {
        unique.add(typeValue.trim());
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [shopRecords]);

  // --- phần UI return giữ nguyên như code đã merge ở trên ---
  // (bao gồm DatePicker, debt section, notes, AddShopModal với availableTypes và origin)

  // cuối file:
}

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M12.5 5 7.5 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 10H4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-5 w-5"
  >
    <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

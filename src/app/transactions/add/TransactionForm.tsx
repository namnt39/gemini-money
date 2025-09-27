"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, Subcategory, Person, Shop } from "./formData";
import { createTransaction, updateTransaction } from "../actions";
import AmountInput from "@/components/forms/AmountInput";
import CustomSelect from "@/components/forms/CustomSelect";
import CashbackInput from "@/components/forms/CashbackInput";
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
  returnTo: string;
  createdSubcategoryId?: string;
  initialTab?: Tab;
  initialTransaction?: TransactionListItem;
  mode?: "create" | "edit";
  onClose?: () => void;
  layout?: "page" | "modal";
};
type CashbackInfo = { percent: number; amount: number; source: CashbackSource };
type CashbackSource = "percent" | "amount" | null;

const formatAmountForInput = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return parsed.toISOString().split("T")[0];
};

const determineTabFromTransactionRecord = (transaction: TransactionListItem): Tab => {
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
};

const inferDebtModeFromTransaction = (transaction: TransactionListItem): DebtMode => {
  if (transaction.toAccountId && !transaction.fromAccountId) {
    return "collect";
  }
  return "lend";
};

const extractCashbackInfoFromTransaction = (transaction: TransactionListItem): {
  info: CashbackInfo;
  show: boolean;
} => {
  const percentValue = Number.isFinite(transaction.cashbackPercent ?? NaN)
    ? Number(transaction.cashbackPercent ?? 0)
    : 0;
  const amountValue = Number.isFinite(transaction.cashbackAmount ?? NaN)
    ? Number(transaction.cashbackAmount ?? 0)
    : 0;
  const derivedSource: CashbackSource =
    transaction.cashbackSource === "percent" || transaction.cashbackSource === "amount"
      ? transaction.cashbackSource
      : percentValue > 0
        ? "percent"
        : amountValue > 0
          ? "amount"
          : null;

  return {
    info: {
      percent: percentValue,
      amount: amountValue,
      source: derivedSource,
    },
    show: percentValue > 0 || amountValue > 0,
  };
};

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
  active,
  color,
  onClick,
}: {
  title: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active ? `${color} text-white shadow-md` : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"
    }`}
  >
    {title}
  </button>
);

export default function TransactionForm({
  accounts,
  subcategories,
  people,
  shops,
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

  const persistedStateRef = useRef<PersistedState | null>(null);
  if (!isEditMode && persistedStateRef.current === null && typeof window !== "undefined") {
    try {
      const shouldPreserve = sessionStorage.getItem(PRESERVE_KEY) === "1";
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!shouldPreserve) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.removeItem(PRESERVE_KEY);
      }
      if (raw && shouldPreserve) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        const today = new Date().toISOString().split("T")[0];
        const fallbackTag = formatDateTag(new Date()) ?? "";
        persistedStateRef.current = {
          activeTab: parsed.activeTab ?? "expense",
          amount: parsed.amount ?? "",
          fromAccountId: parsed.fromAccountId ?? "",
          toAccountId: parsed.toAccountId ?? "",
          subcategoryId: parsed.subcategoryId ?? "",
          personId: parsed.personId ?? "",
          notes: parsed.notes ?? "",
          date: parsed.date ?? today,
          cashbackPercent: parsed.cashbackPercent ?? 0,
          cashbackAmount: parsed.cashbackAmount ?? 0,
          cashbackSource:
            parsed.cashbackSource === "percent" || parsed.cashbackSource === "amount"
              ? parsed.cashbackSource
              : null,
          debtMode: parsed.debtMode === "collect" ? "collect" : "lend",
          shopId: parsed.shopId ?? "",
          debtTag: typeof parsed.debtTag === "string" ? parsed.debtTag : fallbackTag,
          debtCycleTag: typeof parsed.debtCycleTag === "string" ? parsed.debtCycleTag : fallbackTag,
          useLastMonthTag: Boolean(parsed.useLastMonthTag),
        };
      }
    } catch {
      persistedStateRef.current = null;
    }
  }

  const persistedState = isEditMode ? null : persistedStateRef.current;
  const defaultTabValue: Tab = editingTransaction
    ? determineTabFromTransactionRecord(editingTransaction)
    : persistedState?.activeTab ?? initialTab ?? "expense";
  const defaultAmount = editingTransaction
    ? formatAmountForInput(editingTransaction.amount)
    : persistedState?.amount ?? "";
  const defaultFromAccount = editingTransaction?.fromAccountId ?? persistedState?.fromAccountId ?? "";
  const defaultToAccount = editingTransaction?.toAccountId ?? persistedState?.toAccountId ?? "";
  const defaultSubcategory = editingTransaction?.subcategoryId ?? persistedState?.subcategoryId ?? "";
  const defaultPerson = editingTransaction?.personId ?? persistedState?.personId ?? "";
  const defaultNotes = editingTransaction?.notes ?? persistedState?.notes ?? "";
  const defaultDate = editingTransaction ? toDateInputValue(editingTransaction.date) : persistedState?.date ?? new Date().toISOString().split("T")[0];
  const { info: editingCashbackInfo, show: editingShowCashback } = editingTransaction
    ? extractCashbackInfoFromTransaction(editingTransaction)
    : { info: { percent: 0, amount: 0, source: null }, show: false };
  const defaultCashbackPercent = editingTransaction ? editingCashbackInfo.percent : persistedState?.cashbackPercent ?? 0;
  const defaultCashbackAmount = editingTransaction ? editingCashbackInfo.amount : persistedState?.cashbackAmount ?? 0;
  const defaultCashbackSource: CashbackSource = editingTransaction
    ? editingCashbackInfo.source
    : persistedState?.cashbackSource ?? null;
  const defaultDebtMode: DebtMode = editingTransaction && defaultTabValue === "debt"
    ? inferDebtModeFromTransaction(editingTransaction)
    : persistedState?.debtMode ?? "lend";
  const defaultShopId = editingTransaction?.shopId ?? persistedState?.shopId ?? "";
  const fallbackDebtTag = formatDateTag(editingTransaction?.date ?? new Date()) ?? "";
  const defaultDebtTag = editingTransaction?.debtTag ?? persistedState?.debtTag ?? fallbackDebtTag;
  const defaultDebtCycleTag = editingTransaction?.debtCycleTag ?? persistedState?.debtCycleTag ?? fallbackDebtTag;
  const defaultUseLastMonthTag = persistedState?.useLastMonthTag ?? false;

  const [activeTab, setActiveTab] = useState<Tab>(defaultTabValue);
  const [amount, setAmount] = useState(defaultAmount);
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccount);
  const [toAccountId, setToAccountId] = useState(defaultToAccount);
  const [subcategoryId, setSubcategoryId] = useState(defaultSubcategory);
  const [personId, setPersonId] = useState(defaultPerson);
  const [notes, setNotes] = useState(defaultNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [debtMode, setDebtMode] = useState<DebtMode>(defaultDebtMode);
  const [shopId, setShopId] = useState(defaultShopId);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [debtTagValue, setDebtTagValue] = useState(defaultDebtTag);
  const [debtCycleTagValue, setDebtCycleTagValue] = useState(defaultDebtCycleTag);
  const [useLastMonthTag, setUseLastMonthTag] = useState(defaultUseLastMonthTag);
  const [shopRecords, setShopRecords] = useState<Shop[]>(() => shops);
  const [isShopModalOpen, setShopModalOpen] = useState(false);

  const [showCashback, setShowCashback] = useState(() => (isEditMode ? editingShowCashback : false));
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(() => {
    if (defaultFromAccount) {
      return accounts.find((account) => account.id === defaultFromAccount) ?? null;
    }
    return null;
  });
  const [cashbackInfo, setCashbackInfo] = useState<CashbackInfo>({
    percent: defaultCashbackPercent,
    amount: defaultCashbackAmount,
    source: defaultCashbackSource,
  });

  const debtTagInputId = useId();
  const debtCycleInputId = useId();
  const debtTagListId = useId();

  const recentDebtTags = useMemo(() => {
    const tags = new Set<string>();
    const addTag = (value?: string | null) => {
      if (!value) {
        return;
      }
      const trimmed = value.trim();
      if (trimmed) {
        tags.add(trimmed);
      }
    };
    for (let offset = 0; offset < 6; offset += 1) {
      const reference = new Date();
      reference.setMonth(reference.getMonth() - offset, 1);
      addTag(formatDateTag(reference));
    }
    addTag(debtTagValue);
    addTag(debtCycleTagValue);
    return Array.from(tags);
  }, [debtCycleTagValue, debtTagValue]);

  const handleToggleLastMonth = useCallback(
    (checked: boolean) => {
      setUseLastMonthTag(checked);
      if (checked) {
        const previous = new Date();
        previous.setMonth(previous.getMonth() - 1, 1);
        const tag = formatDateTag(previous) ?? "";
        setDebtTagValue(tag);
      } else if (!debtTagValue.trim()) {
        const current = formatDateTag(new Date()) ?? "";
        setDebtTagValue(current);
      }
    },
    [debtTagValue]
  );

  useEffect(() => {
    setShopRecords((prev) => {
      const existingIds = new Set(prev.map((shop) => shop.id));
      const merged = [...prev];
      shops.forEach((shop) => {
        if (!existingIds.has(shop.id)) {
          merged.push(shop);
        }
      });
      return merged;
    });
  }, [shops]);

  useEffect(() => {
    if (debtMode === "collect" && useLastMonthTag) {
      setUseLastMonthTag(false);
    }
  }, [debtMode, useLastMonthTag]);

  useEffect(() => {
    if (debtMode === "collect" && !debtCycleTagValue.trim()) {
      const currentTag = formatDateTag(new Date()) ?? "";
      setDebtCycleTagValue(currentTag);
    }
    if (debtMode === "lend" && !debtTagValue.trim()) {
      const currentTag = formatDateTag(new Date()) ?? "";
      setDebtTagValue(currentTag);
    }
  }, [debtMode, debtCycleTagValue, debtTagValue]);

  const initialSnapshotRef = useRef<PersistedState>({
    activeTab: defaultTabValue,
    amount: defaultAmount,
    fromAccountId: defaultFromAccount,
    toAccountId: defaultToAccount,
    subcategoryId: defaultSubcategory,
    personId: defaultPerson,
    notes: defaultNotes,
    date: defaultDate,
    cashbackPercent: defaultCashbackPercent,
    cashbackAmount: defaultCashbackAmount,
    cashbackSource: defaultCashbackSource,
    debtMode: defaultDebtMode,
    shopId: defaultShopId,
    debtTag: defaultDebtTag,
    debtCycleTag: defaultDebtCycleTag,
    useLastMonthTag: defaultUseLastMonthTag,
  });

  // Determine whether to show cashback input based on the selected expense account
  useEffect(() => {
    const account = accounts.find((a) => a.id === fromAccountId) ?? null;
    setSelectedAccount(account);
    const shouldEnableCashback = Boolean(account?.is_cashback_eligible) ||
      (isEditMode && editingTransaction && editingTransaction.fromAccountId === account?.id && editingShowCashback);

    if (shouldEnableCashback) {
      setShowCashback(true);
    } else {
      setShowCashback(false);
      setCashbackInfo({ percent: 0, amount: 0, source: null });
    }
  }, [accounts, fromAccountId, editingShowCashback, editingTransaction, isEditMode]);

  const getTransactionNature = useCallback((sub: Subcategory): TransactionNatureCode | null => {
    const direct = normalizeTransactionNature(sub.transaction_nature ?? null);
    if (direct) {
      return direct;
    }
    if (!sub.categories) return null;
    if (Array.isArray(sub.categories)) {
      return normalizeTransactionNature(sub.categories[0]?.transaction_nature ?? null);
    }
    return normalizeTransactionNature(sub.categories.transaction_nature ?? null);
  }, []);

  const mapNatureToTab = useCallback((nature: string | null | undefined): Tab | null => {
    const normalized = normalizeTransactionNature(nature ?? null);
    if (!normalized) return null;
    if (normalized === "IN") return "income";
    if (normalized === "TF") return "transfer";
    if (normalized === "DE") return "debt";
    if (normalized === "EX") return "expense";
    return null;
  }, []);

  useEffect(() => {
    if (!createdSubcategoryId) {
      return;
    }
    const newlyCreated = subcategories.find((item) => item.id === createdSubcategoryId);
    if (!newlyCreated) {
      return;
    }
    setSubcategoryId(createdSubcategoryId);
    const mappedTab = mapNatureToTab(getTransactionNature(newlyCreated));
    if (mappedTab && mappedTab !== activeTab) {
      setActiveTab(mappedTab);
    }
  }, [createdSubcategoryId, subcategories, mapNatureToTab, getTransactionNature, activeTab]);

  const mapToOptions = useCallback(
    (item: {
      id: string;
      name: string;
      image_url?: string | null;
      type?: string | null;
      is_group?: boolean | null;
    }) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.image_url || undefined,
      type:
        item.type ||
        (typeof item.is_group === "boolean" ? (item.is_group ? "Group" : "Individual") : undefined),
    }),
    []
  );

  const generateShopId = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const expenseCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "EX").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const incomeCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "IN").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const transferCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "TF").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const accountsWithOptions = useMemo(() => accounts.map(mapToOptions), [accounts, mapToOptions]);
  const bankAccountOptions = useMemo(
    () => accounts.filter((account) => account.type?.toLowerCase() === "bank").map(mapToOptions),
    [accounts, mapToOptions]
  );
  const peopleWithOptions = useMemo(() => people.map(mapToOptions), [people, mapToOptions]);
  const shopOptions = useMemo(() => shopRecords.map(mapToOptions), [mapToOptions, shopRecords]);

  const selectedSubcategory = useMemo(() => {
    if (!subcategoryId) {
      return null;
    }
    return subcategories.find((item) => item.id === subcategoryId) ?? null;
  }, [subcategoryId, subcategories]);

  const isShopCategory = selectedSubcategory?.is_shop ?? false;

  const shouldShowShopSection = useMemo(() => {
    if (activeTab === "debt") {
      return true;
    }
    if (activeTab === "expense" || activeTab === "income") {
      return Boolean(isShopCategory || shopId);
    }
    if (activeTab === "transfer") {
      return Boolean(shopId);
    }
    return false;
  }, [activeTab, isShopCategory, shopId]);

  useEffect(() => {
    if (!shouldShowShopSection && shopId) {
      setShopId("");
    }
  }, [shouldShowShopSection, shopId]);

  useEffect(() => {
    if (activeTab !== "debt") {
      return;
    }
    if (debtMode === "lend") {
      setToAccountId("");
    } else {
      setFromAccountId("");
      if (bankAccountOptions.length > 0 && !bankAccountOptions.some((option) => option.id === toAccountId)) {
        setToAccountId(bankAccountOptions[0].id);
      }
    }
  }, [activeTab, bankAccountOptions, debtMode, toAccountId]);

  const addCategoryLabel = useMemo(() => {
    switch (activeTab) {
      case "income":
        return t("transactionForm.addCategory.income");
      case "transfer":
        return t("transactionForm.addCategory.transfer");
      case "debt":
        return t("transactionForm.addCategory.debt");
      default:
        return t("transactionForm.addCategory.expense");
    }
  }, [activeTab, t]);

  const handleAddAccount = useCallback(() => {
    alert(t("transactionForm.addAccountPlaceholder"));
  }, [t]);

  const handleAddShop = useCallback(() => {
    setShopModalOpen(true);
  }, []);

  const handleCreateShopRecord = useCallback(
    (values: { name: string; type?: string; notes?: string | null }) => {
      const id = generateShopId();
      const record: Shop = {
        id,
        name: values.name,
        image_url: null,
        type: values.type ? values.type.toLowerCase() : null,
        created_at: new Date().toISOString(),
      };
      setShopRecords((prev) => [record, ...prev]);
      setShopId(id);
      setShopModalOpen(false);
      showSuccess(t("transactionForm.shop.createSuccess"));
    },
    [generateShopId, showSuccess, t]
  );

  const handleCloseShopModal = useCallback(() => setShopModalOpen(false), []);

  const returnPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    const query = params.toString();
    return query ? `/transactions/add?${query}` : "/transactions/add";
  }, [activeTab]);

  const handleAddCategory = useCallback(() => {
    const natureMap: Record<Tab, string> = {
      expense: "EX",
      income: "IN",
      transfer: "TF",
      debt: "DE",
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(PRESERVE_KEY, "1");
    }
    const params = new URLSearchParams({
      defaultNature: natureMap[activeTab],
    });
    params.set("returnTo", encodeURIComponent(returnPath));
    router.push(`/categories/add?${params.toString()}`);
  }, [activeTab, returnPath, router]);

  const completeNavigation = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(PRESERVE_KEY);
    }
    if (onClose) {
      onClose();
    }
    navigate(returnTo);
  }, [navigate, onClose, returnTo]);

  const isDirty = useMemo(() => {
    const snapshot = initialSnapshotRef.current;
    return (
      snapshot.activeTab !== activeTab ||
      snapshot.amount !== amount ||
      snapshot.fromAccountId !== fromAccountId ||
      snapshot.toAccountId !== toAccountId ||
      snapshot.subcategoryId !== subcategoryId ||
      snapshot.personId !== personId ||
      snapshot.notes !== notes ||
      snapshot.date !== date ||
      snapshot.cashbackPercent !== cashbackInfo.percent ||
      snapshot.cashbackAmount !== cashbackInfo.amount ||
      snapshot.cashbackSource !== cashbackInfo.source ||
      snapshot.debtMode !== debtMode ||
      snapshot.shopId !== shopId ||
      snapshot.debtTag !== debtTagValue ||
      snapshot.debtCycleTag !== debtCycleTagValue ||
      snapshot.useLastMonthTag !== useLastMonthTag
    );
  }, [
    activeTab,
    amount,
    fromAccountId,
    toAccountId,
    subcategoryId,
    personId,
    notes,
    date,
    cashbackInfo,
    debtMode,
    shopId,
    debtTagValue,
    debtCycleTagValue,
    useLastMonthTag,
  ]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowLeaveDialog(true);
      return;
    }
    completeNavigation();
  }, [completeNavigation, isDirty]);

  const handleConfirmLeave = useCallback(() => {
    setShowLeaveDialog(false);
    completeNavigation();
  }, [completeNavigation]);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveDialog(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isEditMode) {
      return;
    }
    const payload: PersistedState = {
      activeTab,
      amount,
      fromAccountId,
      toAccountId,
      subcategoryId,
      personId,
      notes,
      date,
      cashbackPercent: cashbackInfo.percent,
      cashbackAmount: cashbackInfo.amount,
      cashbackSource: cashbackInfo.source,
      debtMode,
      shopId,
      debtTag: debtTagValue,
      debtCycleTag: debtCycleTagValue,
      useLastMonthTag,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    persistedStateRef.current = payload;
  }, [
    activeTab,
    amount,
    cashbackInfo,
    debtMode,
    fromAccountId,
    isEditMode,
    notes,
    personId,
    shopId,
    subcategoryId,
    toAccountId,
    date,
    debtTagValue,
    debtCycleTagValue,
    useLastMonthTag,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "transfer" && fromAccountId && fromAccountId === toAccountId) {
      alert(t("transactionForm.errors.sameTransferAccount"));
      return;
    }
    setIsSubmitting(true);

    const sanitizedCashback = showCashback
      ? {
          percent: Number.isFinite(cashbackInfo.percent) ? Number(cashbackInfo.percent) : 0,
          amount: Number.isFinite(cashbackInfo.amount) ? Number(cashbackInfo.amount) : 0,
          source: cashbackInfo.source,
        }
      : null;

    const preparedFromAccountId = activeTab === "debt" && debtMode === "collect" ? "" : fromAccountId;
    const preparedToAccountId = activeTab === "debt" && debtMode === "lend" ? "" : toAccountId;

    const normalizedNotes = notes?.trim() ? notes.trim() : null;
    const sanitizedPayload = {
      activeTab,
      amount: parseFloat(amount.replace(/,/g, "")),
      notes: normalizedNotes,
      fromAccountId: preparedFromAccountId?.trim() ? preparedFromAccountId.trim() : undefined,
      toAccountId: preparedToAccountId?.trim() ? preparedToAccountId.trim() : undefined,
      subcategoryId: subcategoryId?.trim() ? subcategoryId.trim() : undefined,
      personId: personId?.trim() ? personId.trim() : undefined,
      date,
      cashback: sanitizedCashback,
      debtMode,
      shopId: shopId?.trim() ? shopId.trim() : undefined,
      debtTag:
        activeTab === "debt" && debtMode !== "collect"
          ? debtTagValue.trim() || undefined
          : undefined,
      debtCycleTag:
        activeTab === "debt" && debtMode === "collect"
          ? debtCycleTagValue.trim() || undefined
          : undefined,
    };

    const result = isEditMode && editingTransaction
      ? await updateTransaction({ id: editingTransaction.id, ...sanitizedPayload })
      : await createTransaction(sanitizedPayload);

    setIsSubmitting(false);

    if (!result.success) {
      alert(result.message);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(PRESERVE_KEY);
    }

    showSuccess(result.message);
    navigate(returnTo);
  };

  useEffect(() => {
    if (isEditMode) {
      return () => undefined;
    }
    return () => {
      if (typeof window !== "undefined") {
        const shouldPreserve = sessionStorage.getItem(PRESERVE_KEY) === "1";
        if (!shouldPreserve) {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(PRESERVE_KEY);
        }
      }
    };
  }, [isEditMode]);

  const formClasses =
    layout === "modal"
      ? "flex h-full min-h-0 flex-col overflow-hidden"
      : "overflow-hidden rounded-lg border border-gray-200 shadow-sm";

  const contentWrapperClasses =
    layout === "modal"
      ? "flex-1 min-h-0 overflow-y-auto bg-white p-6 space-y-6"
      : "space-y-6 bg-white p-6";
  const dateTag = useMemo(() => formatDateTag(date), [date]);

  return (
    <>
      <form onSubmit={handleSubmit} className={formClasses}>
      {layout === "modal" ? (
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100"
            aria-label={t("common.close")}
          >
            <CloseIcon />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{t("transactionForm.title")}</h2>
          <span className="h-9 w-9" aria-hidden="true" />
        </div>
      ) : null}
      <div className="flex flex-shrink-0 flex-col gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <TabButton title={t("transactionForm.tabs.expense")} active={activeTab === "expense"} color={tabColors.expense} onClick={() => setActiveTab("expense")} />
          <TabButton title={t("transactionForm.tabs.income")} active={activeTab === "income"} color={tabColors.income} onClick={() => setActiveTab("income")} />
          <TabButton title={t("transactionForm.tabs.transfer")} active={activeTab === "transfer"} color={tabColors.transfer} onClick={() => setActiveTab("transfer")} />
          <TabButton title={t("transactionForm.tabs.debt")} active={activeTab === "debt"} color={tabColors.debt} onClick={() => setActiveTab("debt")} />
        </div>
      </div>

      <div className={contentWrapperClasses}>
        <div className="grid gap-6 md:grid-cols-2">
          <AmountInput value={amount} onChange={setAmount} />
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("common.date")}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {activeTab !== "debt" && dateTag ? (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  {dateTag}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {activeTab === "expense" && (
          <>
            <CustomSelect
              label={t("transactionForm.labels.fromAccount")}
              value={fromAccountId}
              onChange={setFromAccountId}
              options={accountsWithOptions}
              required
              onAddNew={handleAddAccount}
              addNewLabel={t("transactionForm.addAccount")}
            />

            {showCashback && selectedAccount && (
              <CashbackInput
                transactionAmount={amount}
                account={selectedAccount}
                onCashbackChange={setCashbackInfo}
              />
            )}

            <CustomSelect
              label={t("transactionForm.labels.expenseCategory")}
              value={subcategoryId}
              onChange={setSubcategoryId}
              options={expenseCategories}
              required
              onAddNew={handleAddCategory}
              addNewLabel={addCategoryLabel}
            />
          </>
        )}

        {activeTab === "income" && (
          <>
            <CustomSelect
              label={t("transactionForm.labels.toAccount")}
              value={toAccountId}
              onChange={setToAccountId}
              options={accountsWithOptions}
              required
              onAddNew={handleAddAccount}
              addNewLabel={t("transactionForm.addAccount")}
            />
            <CustomSelect
              label={t("transactionForm.labels.incomeCategory")}
              value={subcategoryId}
              onChange={setSubcategoryId}
              options={incomeCategories}
              required
              onAddNew={handleAddCategory}
              addNewLabel={addCategoryLabel}
            />
          </>
        )}

        {activeTab === "transfer" && (
          <>
            <CustomSelect
              label={t("transactionForm.labels.transferCategory")}
              value={subcategoryId}
              onChange={setSubcategoryId}
              options={transferCategories}
              required
              onAddNew={handleAddCategory}
              addNewLabel={addCategoryLabel}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <CustomSelect
                label={t("transactionForm.labels.fromAccount")}
                value={fromAccountId}
                onChange={setFromAccountId}
                options={accountsWithOptions}
                required
                onAddNew={handleAddAccount}
                addNewLabel={t("transactionForm.addAccount")}
              />
              <CustomSelect
                label={t("transactionForm.labels.toAccount")}
                value={toAccountId}
                onChange={setToAccountId}
                options={accountsWithOptions}
                required
                onAddNew={handleAddAccount}
                addNewLabel={t("transactionForm.addAccount")}
              />
            </div>
            <p className="text-xs text-indigo-600">{t("transactionForm.hints.transferSameAccount")}</p>
          </>
        )}

        {activeTab === "debt" && (
          <>
            <CustomSelect
              label={t("transactionForm.labels.whoOwes")}
              value={personId}
              onChange={setPersonId}
              options={peopleWithOptions}
              required
            />

            <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-100/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                    {t("transactionForm.debt.directionTitle")}
                  </p>
                  <p className="text-xs text-amber-800">{t("transactionForm.debt.directionHelper")}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {(["lend", "collect"] as DebtMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDebtMode(mode)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        debtMode === mode
                          ? debtModePalette[mode].active
                          : debtModePalette[mode].inactive
                      }`}
                      aria-pressed={debtMode === mode}
                    >
                      {t(`transactionForm.debtModes.${mode}` as const)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="space-y-2">
                  <label
                    className={`text-sm font-medium ${
                      debtMode === "collect" ? "text-emerald-800" : "text-amber-800"
                    }`}
                    htmlFor={debtMode === "collect" ? debtCycleInputId : debtTagInputId}
                  >
                    {debtMode === "collect"
                      ? t("transactionForm.debt.cycleLabel")
                      : t("transactionForm.debt.tagLabel")}
                  </label>
                  <input
                    id={debtMode === "collect" ? debtCycleInputId : debtTagInputId}
                    list={debtTagListId}
                    value={debtMode === "collect" ? debtCycleTagValue : debtTagValue}
                    onChange={(event) =>
                      debtMode === "collect"
                        ? setDebtCycleTagValue(event.target.value)
                        : setDebtTagValue(event.target.value)
                    }
                    className={`w-full rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 ${
                      debtMode === "collect"
                        ? "border border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200"
                        : "border border-amber-200 focus:border-amber-500 focus:ring-amber-200"
                    }`}
                    placeholder={t(
                      debtMode === "collect"
                        ? "transactionForm.debt.cyclePlaceholder"
                        : "transactionForm.debt.tagPlaceholder"
                    )}
                  />
                  <datalist id={debtTagListId}>
                    {recentDebtTags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <p
                    className={`text-xs ${
                      debtMode === "collect" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {t(
                      debtMode === "collect"
                        ? "transactionForm.debt.cycleHelper"
                        : "transactionForm.debt.tagHelper"
                    )}
                  </p>
                </div>
                {debtMode === "lend" ? (
                  <label className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-700 shadow-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      checked={useLastMonthTag}
                      onChange={(event) => handleToggleLastMonth(event.target.checked)}
                    />
                    {t("transactionForm.debt.lastMonthToggle")}
                  </label>
                ) : null}
              </div>
            </div>

            {debtMode === "lend" ? (
              <CustomSelect
                label={t("transactionForm.labels.withdrawFromAccount")}
                value={fromAccountId}
                onChange={setFromAccountId}
                options={accountsWithOptions}
                required
                onAddNew={handleAddAccount}
                addNewLabel={t("transactionForm.addAccount")}
              />
            ) : (
              <CustomSelect
                label={t("transactionForm.labels.toAccount")}
                value={toAccountId}
                onChange={setToAccountId}
                options={bankAccountOptions.length > 0 ? bankAccountOptions : accountsWithOptions}
                required
                onAddNew={handleAddAccount}
                addNewLabel={t("transactionForm.addAccount")}
              />
            )}
          </>
        )}

        {shouldShowShopSection && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-100/60 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">
                {t("transactionForm.shop.sectionTitle")}
              </p>
              <p className="text-xs text-emerald-700">{t("transactionForm.shop.helper")}</p>
            </div>
            <div className="p-4">
              <CustomSelect
                label={t("transactionForm.shop.shopLabel")}
                value={shopId}
                onChange={setShopId}
                options={shopOptions}
                onAddNew={handleAddShop}
                addNewLabel={t("transactionForm.shop.addShop")}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("common.notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div
          className={`flex flex-shrink-0 flex-col gap-3 border-t border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between ${
            layout === "modal" ? "bg-white" : "bg-gray-50 pt-4"
          }`}
        >
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            <ArrowLeftIcon />
            {t("common.back")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("transactionForm.actions.submitting") : t("transactionForm.actions.submit")}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={showLeaveDialog}
        title={t("transactionForm.confirmLeaveTitle")}
        description={t("transactionForm.confirmLeave")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.confirm")}
        onCancel={handleCancelLeave}
        onConfirm={handleConfirmLeave}
      />
      </form>
      <AddShopModal open={isShopModalOpen} onClose={handleCloseShopModal} onCreate={handleCreateShopRecord} />
    </>
  );
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, Subcategory, Person } from "./page";
import { createTransaction } from "../actions";
import AmountInput from "@/components/forms/AmountInput";
import CustomSelect from "@/components/forms/CustomSelect";
import CashbackInput from "@/components/forms/CashbackInput";
import { createTranslator } from "@/lib/i18n";

type Tab = "expense" | "income" | "transfer" | "debt";
type TransactionFormProps = {
  accounts: Account[];
  subcategories: Subcategory[];
  people: Person[];
  returnTo: string;
  createdCategoryId?: string;
  initialTab?: Tab;
};
type CashbackInfo = { percent: number; amount: number };

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
};

const STORAGE_KEY = "transactions:add-form-state";

const tabColors: Record<Tab, string> = {
  expense: "bg-red-500",
  income: "bg-green-500",
  transfer: "bg-blue-500",
  debt: "bg-yellow-500",
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
  returnTo,
  createdCategoryId,
  initialTab,
}: TransactionFormProps) {
  const t = createTranslator();
  const router = useRouter();

  const persistedStateRef = useRef<PersistedState | null>(null);
  if (persistedStateRef.current === null && typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        persistedStateRef.current = JSON.parse(raw) as PersistedState;
      }
    } catch {
      persistedStateRef.current = null;
    }
  }

  const persistedState = persistedStateRef.current;
  const defaultTabValue: Tab = persistedState?.activeTab ?? initialTab ?? "expense";
  const defaultAmount = persistedState?.amount ?? "";
  const defaultFromAccount = persistedState?.fromAccountId ?? "";
  const defaultToAccount = persistedState?.toAccountId ?? "";
  const defaultSubcategory = persistedState?.subcategoryId ?? "";
  const defaultPerson = persistedState?.personId ?? "";
  const defaultNotes = persistedState?.notes ?? "";
  const defaultDate = persistedState?.date ?? new Date().toISOString().split("T")[0];
  const defaultCashbackPercent = persistedState?.cashbackPercent ?? 0;
  const defaultCashbackAmount = persistedState?.cashbackAmount ?? 0;

  const [activeTab, setActiveTab] = useState<Tab>(defaultTabValue);
  const [amount, setAmount] = useState(defaultAmount);
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccount);
  const [toAccountId, setToAccountId] = useState(defaultToAccount);
  const [subcategoryId, setSubcategoryId] = useState(defaultSubcategory);
  const [personId, setPersonId] = useState(defaultPerson);
  const [notes, setNotes] = useState(defaultNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(defaultDate);

  const [showCashback, setShowCashback] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [cashbackInfo, setCashbackInfo] = useState<CashbackInfo>({
    percent: defaultCashbackPercent,
    amount: defaultCashbackAmount,
  });

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
  });

  // Determine whether to show cashback input based on the selected expense account
  useEffect(() => {
    const account = accounts.find((a) => a.id === fromAccountId);
    if (account && account.is_cashback_eligible) {
      setShowCashback(true);
      setSelectedAccount(account);
    } else {
      setShowCashback(false);
      setSelectedAccount(null);
      setCashbackInfo({ percent: 0, amount: 0 });
    }
  }, [fromAccountId, accounts]);

  const getTransactionNature = useCallback((sub: Subcategory): string | null => {
    if (sub.transaction_nature) {
      return sub.transaction_nature;
    }
    if (!sub.categories) return null;
    if (Array.isArray(sub.categories)) {
      return sub.categories[0]?.transaction_nature ?? null;
    }
    return sub.categories.transaction_nature ?? null;
  }, []);

  const mapNatureToTab = useCallback((nature: string | null | undefined): Tab | null => {
    if (!nature) return null;
    const normalized = nature.toUpperCase();
    if (normalized === "IN") return "income";
    if (normalized === "TR") return "transfer";
    if (normalized === "DE") return "debt";
    if (normalized === "EX") return "expense";
    return null;
  }, []);

  useEffect(() => {
    if (!createdCategoryId) {
      return;
    }
    const newlyCreated = subcategories.find((item) => item.id === createdCategoryId);
    if (!newlyCreated) {
      return;
    }
    setSubcategoryId(createdCategoryId);
    const mappedTab = mapNatureToTab(getTransactionNature(newlyCreated));
    if (mappedTab && mappedTab !== activeTab) {
      setActiveTab(mappedTab);
    }
  }, [createdCategoryId, subcategories, mapNatureToTab, getTransactionNature, activeTab]);

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

  const expenseCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "EX").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const incomeCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "IN").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const transferCategories = useMemo(
    () => subcategories.filter((s) => getTransactionNature(s) === "TR").map(mapToOptions),
    [subcategories, getTransactionNature, mapToOptions]
  );
  const accountsWithOptions = useMemo(() => accounts.map(mapToOptions), [accounts, mapToOptions]);
  const peopleWithOptions = useMemo(() => people.map(mapToOptions), [people, mapToOptions]);

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
      transfer: "TR",
      debt: "DE",
    };
    const params = new URLSearchParams({
      defaultNature: natureMap[activeTab],
    });
    params.set("returnTo", encodeURIComponent(returnPath));
    router.push(`/categories/add?${params.toString()}`);
  }, [activeTab, returnPath, router]);

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
      snapshot.cashbackAmount !== cashbackInfo.amount
    );
  }, [activeTab, amount, fromAccountId, toAccountId, subcategoryId, personId, notes, date, cashbackInfo]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      const shouldLeave = confirm(t("transactionForm.confirmLeave"));
      if (!shouldLeave) {
        return;
      }
    }
    router.push(returnTo);
    router.refresh();
  }, [isDirty, router, returnTo, t]);

  useEffect(() => {
    if (typeof window === "undefined") {
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
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    persistedStateRef.current = payload;
  }, [activeTab, amount, fromAccountId, toAccountId, subcategoryId, personId, notes, date, cashbackInfo]);

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
        }
      : null;

    const result = await createTransaction({
      activeTab,
      amount: parseFloat(amount.replace(/,/g, "")),
      notes: notes || null,
      fromAccountId,
      toAccountId,
      subcategoryId,
      personId,
      date,
      cashback: sanitizedCashback, // include cashback values
    });

    setIsSubmitting(false);
    alert(result.message);

    if (result.success) {
      const today = new Date().toISOString().split("T")[0];
      setAmount("");
      setFromAccountId("");
      setToAccountId("");
      setSubcategoryId("");
      setPersonId("");
      setNotes("");
      setDate(today);
      setCashbackInfo({ percent: 0, amount: 0 });
      sessionStorage.removeItem(STORAGE_KEY);
      const resetSnapshot: PersistedState = {
        activeTab,
        amount: "",
        fromAccountId: "",
        toAccountId: "",
        subcategoryId: "",
        personId: "",
        notes: "",
        date: today,
        cashbackPercent: 0,
        cashbackAmount: 0,
      };
      initialSnapshotRef.current = resetSnapshot;
      persistedStateRef.current = resetSnapshot;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <TabButton title={t("transactionForm.tabs.expense")} active={activeTab === "expense"} color={tabColors.expense} onClick={() => setActiveTab("expense")} />
          <TabButton title={t("transactionForm.tabs.income")} active={activeTab === "income"} color={tabColors.income} onClick={() => setActiveTab("income")} />
          <TabButton title={t("transactionForm.tabs.transfer")} active={activeTab === "transfer"} color={tabColors.transfer} onClick={() => setActiveTab("transfer")} />
          <TabButton title={t("transactionForm.tabs.debt")} active={activeTab === "debt"} color={tabColors.debt} onClick={() => setActiveTab("debt")} />
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 md:w-auto"
        >
          {t("common.back")}
        </button>
      </div>

      <div className="space-y-6 bg-white p-6">
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
            <CustomSelect
              label={t("transactionForm.labels.withdrawFromAccount")}
              value={fromAccountId}
              onChange={setFromAccountId}
              options={accountsWithOptions}
              required
              onAddNew={handleAddAccount}
              addNewLabel={t("transactionForm.addAccount")}
            />
          </>
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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("transactionForm.actions.submitting") : t("transactionForm.actions.submit")}
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { createTranslator } from "@/lib/i18n";
import { numberToVietnameseWords } from "@/lib/numberToVietnameseWords";
import {
  type BasicOption,
  type CategoryOption,
  type TransactionNature,
  type TransactionRecord,
  createTransaction,
} from "@/lib/transactions";

const STORAGE_KEY = "transactions:add-dialog";

const amountFormatter = new Intl.NumberFormat("vi-VN");

export type AddTxnTab = "expense" | "income" | "transfer" | "debt";

const TAB_TO_NATURE: Record<AddTxnTab, TransactionNature> = {
  expense: "EX",
  income: "IN",
  transfer: "TF",
  debt: "DEBT",
};

type FormState = {
  amountRaw: string;
  date: string;
  notes: string;
  accountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  shopId?: string | null;
  cashbackPercent?: string;
  cashbackAmount?: string;
  debtMode: "lend" | "collect";
};

const defaultFormState: FormState = {
  amountRaw: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  accountId: null,
  toAccountId: null,
  categoryId: null,
  shopId: null,
  cashbackPercent: "",
  cashbackAmount: "",
  debtMode: "lend",
};

type AddTxnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BasicOption[];
  categories: CategoryOption[];
  shops: BasicOption[];
  onCreated?: (transaction: TransactionRecord) => void;
};

type StorageValue = {
  tab: AddTxnTab;
  amountRaw: string;
  date: string;
};

function parseAmountValue(raw: string) {
  if (!raw) return 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : 0;
}

function getCategoriesForTab(categories: CategoryOption[], tab: AddTxnTab) {
  const targetNature = TAB_TO_NATURE[tab];
  return categories.filter((category) => category.transaction_nature === targetNature);
}

export default function AddTxnDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  shops,
  onCreated,
}: AddTxnDialogProps) {
  const t = useMemo(() => createTranslator(), []);
  const [activeTab, setActiveTab] = useState<AddTxnTab>("expense");
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const amountValue = parseAmountValue(formState.amountRaw);
  const formattedAmount = formState.amountRaw ? amountFormatter.format(amountValue) : "";
  const amountWords = amountValue ? numberToVietnameseWords(amountValue) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as StorageValue;
      if (parsed.tab) {
        setActiveTab(parsed.tab);
      }
      setFormState((previous) => ({
        ...previous,
        amountRaw: parsed.amountRaw ?? previous.amountRaw,
        date: parsed.date ?? previous.date,
      }));
    } catch (error) {
      console.warn("Failed to restore draft", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: StorageValue = {
      tab: activeTab,
      amountRaw: formState.amountRaw,
      date: formState.date,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [activeTab, formState.amountRaw, formState.date]);

  const categoriesForTab = useMemo(
    () => getCategoriesForTab(categories, activeTab),
    [categories, activeTab]
  );

  const isDirty = useMemo(() => {
    return (
      formState.amountRaw !== "" ||
      formState.notes.trim().length > 0 ||
      formState.accountId ||
      formState.toAccountId ||
      formState.categoryId ||
      formState.shopId ||
      (formState.cashbackPercent && formState.cashbackPercent !== "") ||
      (formState.cashbackAmount && formState.cashbackAmount !== "")
    );
  }, [formState]);

  const handleClose = () => {
    if (isDirty) {
      setShowConfirm(true);
      return;
    }
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setErrorMessage(null);
  };

  const handleTabChange = (tab: AddTxnTab) => {
    setActiveTab(tab);
    setFormState((prev) => ({
      ...prev,
      categoryId: null,
      cashbackPercent: tab === "expense" ? prev.cashbackPercent : "",
      cashbackAmount: tab === "expense" ? prev.cashbackAmount : "",
    }));
  };

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setFormState((prev) => ({ ...prev, amountRaw: cleaned }));
  };

  const handleCashbackPercentChange = (value: string) => {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      setFormState((prev) => ({ ...prev, cashbackPercent: "", cashbackAmount: prev.cashbackAmount }));
      return;
    }
    const clamped = Math.min(100, Math.max(0, numeric));
    const calculated = amountValue ? Math.round((amountValue * clamped) / 100) : 0;
    setFormState((prev) => ({
      ...prev,
      cashbackPercent: clamped.toString(),
      cashbackAmount: calculated ? calculated.toString() : prev.cashbackAmount,
    }));
  };

  const handleCashbackAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setFormState((prev) => ({ ...prev, cashbackAmount: cleaned }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!amountValue) {
      setErrorMessage(t("transactions.form.amount"));
      return;
    }
    if (!formState.date) {
      setErrorMessage(t("transactions.form.date"));
      return;
    }

    const nature = TAB_TO_NATURE[activeTab];
    const fromAccountId = activeTab === "income" ? null : formState.accountId ?? null;
    const toAccountId = activeTab === "expense" ? null : formState.toAccountId ?? null;

    if (nature === "EX" && !fromAccountId) {
      setErrorMessage(t("transactions.form.fromAccount"));
      return;
    }
    if (nature === "IN" && !toAccountId) {
      setErrorMessage(t("transactions.form.toAccount"));
      return;
    }
    if (nature === "TF") {
      if (!fromAccountId || !toAccountId) {
        setErrorMessage(t("transactions.form.toAccount"));
        return;
      }
      if (fromAccountId === toAccountId) {
        setErrorMessage(t("transactions.transactionForm.errors.sameTransferAccount" as never));
        return;
      }
    }

    const payload = {
      amount: amountValue,
      date: formState.date,
      nature,
      notes: formState.notes || null,
      finalPrice: amountValue,
      status: "Active",
      fromAccountId,
      toAccountId,
      categoryId: formState.categoryId ?? null,
      shopId: formState.shopId ?? null,
      cashbackPercent: formState.cashbackPercent ? Number(formState.cashbackPercent) : null,
      cashbackAmount: formState.cashbackAmount ? Number(formState.cashbackAmount) : null,
      debtTag: activeTab === "debt" ? formState.debtMode.toUpperCase() : null,
      debtCycleTag: null,
    } as const;

    try {
      setSaving(true);
      const result = await createTransaction(payload);
      if (result.error) {
        setErrorMessage(result.error);
      }
      if (result.data) {
        onCreated?.(result.data);
        resetForm();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const dialogTitle = useMemo(() => {
    switch (activeTab) {
      case "income":
        return t("transactions.nature.income");
      case "transfer":
        return t("transactions.nature.transfer");
      case "debt":
        return t("transactions.nature.debt");
      default:
        return t("transactions.nature.expense");
    }
  }, [activeTab, t]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center px-4 py-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className="flex h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-auto">
                <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      {t("transactions.transactionForm.title" as never)}
                    </Dialog.Title>
                    <p className="text-sm text-slate-500">{dialogTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                  >
                    ×
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "expense", label: t("transactions.nature.expense") },
                        { value: "income", label: t("transactions.nature.income") },
                        { value: "transfer", label: t("transactions.nature.transfer") },
                        { value: "debt", label: t("transactions.nature.debt") },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => handleTabChange(tab.value)}
                        className={`rounded-full px-4 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                          activeTab === tab.value
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">{t("transactions.form.amount")}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formattedAmount}
                        onChange={(event) => handleAmountChange(event.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg font-semibold text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                      />
                      <span className="text-sm text-slate-500">{amountWords}</span>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">{t("transactions.form.date")}</span>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={formState.date}
                          onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormState((prev) => ({ ...prev, date: new Date().toISOString().slice(0, 10) }))
                          }
                          className="rounded-full border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                        >
                          {t("transactions.form.today")}
                        </button>
                      </div>
                    </label>

                    {activeTab !== "income" ? (
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">{t("transactions.form.fromAccount")}</span>
                        <select
                          value={formState.accountId ?? ""}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, accountId: event.target.value || null }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">—</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {activeTab !== "expense" ? (
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-slate-700">{t("transactions.form.toAccount")}</span>
                        <select
                          value={formState.toAccountId ?? ""}
                          onChange={(event) =>
                            setFormState((prev) => ({ ...prev, toAccountId: event.target.value || null }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">—</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">{t("transactions.form.category")}</span>
                      <select
                        value={formState.categoryId ?? ""}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, categoryId: event.target.value || null }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">—</option>
                        {categoriesForTab.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">{t("transactions.form.shop")}</span>
                      <select
                        value={formState.shopId ?? ""}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, shopId: event.target.value || null }))
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">—</option>
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {activeTab === "expense" ? (
                      <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-700">{t("transactions.form.cashbackPercent")}</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={formState.cashbackPercent ?? ""}
                            onChange={(event) => handleCashbackPercentChange(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="0"
                          />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-semibold text-slate-700">{t("transactions.form.cashbackAmount")}</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formState.cashbackAmount ?? ""}
                            onChange={(event) => handleCashbackAmountChange(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="0"
                          />
                        </label>
                      </div>
                    ) : null}

                    <label className="md:col-span-2 flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">{t("transactions.form.notes")}</span>
                      <textarea
                        value={formState.notes}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, notes: event.target.value }))
                        }
                        className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder=""
                      />
                    </label>

                    {activeTab === "debt" ? (
                      <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <span className="font-semibold">{t("transactions.transactionForm.debt.directionTitle" as never)}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormState((prev) => ({ ...prev, debtMode: "lend" }))}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              formState.debtMode === "lend"
                                ? "bg-amber-500 text-white"
                                : "bg-white text-amber-600"
                            }`}
                          >
                            {t("transactions.transactionForm.debtModes.lend" as never)}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormState((prev) => ({ ...prev, debtMode: "collect" }))}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              formState.debtMode === "collect"
                                ? "bg-amber-500 text-white"
                                : "bg-white text-amber-600"
                            }`}
                          >
                            {t("transactions.transactionForm.debtModes.collect" as never)}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {errorMessage ? (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errorMessage}
                    </p>
                  ) : null}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    {t("transactions.form.back")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? t("common.loading") : t("transactions.form.save")}
                  </button>
                </footer>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          resetForm();
          onOpenChange(false);
        }}
        title={t("transactions.transactionForm.confirmLeaveTitle" as never)}
        description={t("transactions.transactionForm.confirmLeave" as never)}
        confirmLabel={t("transactions.form.back")}
        cancelLabel={t("common.cancel")}
      />
    </Transition>
  );
}

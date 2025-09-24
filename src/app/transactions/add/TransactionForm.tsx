"use client";

import { useState, useMemo, useEffect } from "react";
import { Account, Subcategory, Person } from "./page";
import { createTransaction } from "../actions";
import AmountInput from "@/components/forms/AmountInput";
import CustomSelect from "@/components/forms/CustomSelect";
import CashbackInput from "@/components/forms/CashbackInput"; // ✅ COMPONENT MỚI

type Tab = "expense" | "income" | "transfer" | "debt";
type TransactionFormProps = { accounts: Account[]; subcategories: Subcategory[]; people: Person[] };
type CashbackInfo = { percent: number; amount: number };

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
    className={`w-full py-3 text-sm font-medium transition-colors rounded-t-lg ${
      active ? `${color} text-white shadow-md` : "text-gray-500 hover:bg-gray-100 border-b-2 border-gray-200"
    }`}
  >
    {title}
  </button>
);

export default function TransactionForm({ accounts, subcategories, people }: TransactionFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>("expense");
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [personId, setPersonId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Cashback
  const [showCashback, setShowCashback] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [cashbackInfo, setCashbackInfo] = useState<CashbackInfo>({ percent: 0, amount: 0 });

  // Khi chọn tài khoản chi tiêu, quyết định có hiện cashback hay không
  useEffect(() => {
    const account = accounts.find((a) => a.id === fromAccountId);
    if (account && account.is_cashback_eligible) {
      setShowCashback(true);
      setSelectedAccount(account);
    } else {
      setShowCashback(false);
      setSelectedAccount(null);
      setCashbackInfo({ percent: 0, amount: 0 }); // reset nếu đổi sang tk không hỗ trợ
    }
  }, [fromAccountId, accounts]);

  const getTransactionNature = (sub: Subcategory): string | null => {
    if (!sub.categories) return null;
    if (Array.isArray(sub.categories) && sub.categories.length > 0) return sub.categories[0].transaction_nature;
    if (typeof sub.categories === "object" && !Array.isArray(sub.categories))
      return (sub.categories as any).transaction_nature;
    return null;
  };

  const mapToOptions = (item: { id: string; name: string; image_url?: string | null; type?: string | null }) => ({
    id: item.id,
    name: item.name,
    imageUrl: item.image_url || undefined,
    type: item.type || undefined,
  });

  const expenseCategories = subcategories.filter((s) => getTransactionNature(s) === "EX").map(mapToOptions);
  const incomeCategories = subcategories.filter((s) => getTransactionNature(s) === "IN").map(mapToOptions);
  const accountsWithOptions = accounts.map(mapToOptions);
  const peopleWithOptions = people.map(mapToOptions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      cashback: sanitizedCashback, // ✅ GỬI CASHBACK
    });

    setIsSubmitting(false);
    alert(result.message);

    if (result.success) {
      setAmount("");
      setFromAccountId("");
      setToAccountId("");
      setSubcategoryId("");
      setPersonId("");
      setNotes("");
      setCashbackInfo({ percent: 0, amount: 0 });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className="flex">
        <TabButton title="Chi tiêu" active={activeTab === "expense"} color={tabColors.expense} onClick={() => setActiveTab("expense")} />
        <TabButton title="Thu nhập" active={activeTab === "income"} color={tabColors.income} onClick={() => setActiveTab("income")} />
        <TabButton title="Chuyển khoản" active={activeTab === "transfer"} color={tabColors.transfer} onClick={() => setActiveTab("transfer")} />
        <TabButton title="Công nợ" active={activeTab === "debt"} color={tabColors.debt} onClick={() => setActiveTab("debt")} />
      </div>

      <div className="p-6 space-y-6 bg-gray-50 border-x border-b rounded-b-lg shadow-inner">
        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-6">
          <AmountInput value={amount} onChange={setAmount} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Ngày</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-base"
            />
          </div>
        </div>

        {/* EXPENSE */}
        {activeTab === "expense" && (
          <>
            <CustomSelect
              label="Từ Tài khoản"
              value={fromAccountId}
              onChange={setFromAccountId}
              options={accountsWithOptions}
              required
            />

            {/* ✅ Dùng CashbackInput thay cho input thường */}
            {showCashback && selectedAccount && (
              <CashbackInput
                transactionAmount={amount}
                account={selectedAccount}
                onCashbackChange={setCashbackInfo}
              />
            )}

            <CustomSelect
              label="Danh mục Chi tiêu"
              value={subcategoryId}
              onChange={setSubcategoryId}
              options={expenseCategories}
              required
            />
          </>
        )}

        {/* INCOME */}
        {activeTab === "income" && (
          <>
            <CustomSelect
              label="Vào Tài khoản"
              value={toAccountId}
              onChange={setToAccountId}
              options={accountsWithOptions}
              required
            />
            <CustomSelect
              label="Danh mục Thu nhập"
              value={subcategoryId}
              onChange={setSubcategoryId}
              options={incomeCategories}
              required
            />
          </>
        )}

        {/* DEBT */}
        {activeTab === "debt" && (
          <>
            <CustomSelect
              label="Ai nợ?"
              value={personId}
              onChange={setPersonId}
              options={peopleWithOptions}
              required
            />
            <CustomSelect
              label="Rút tiền từ Tài khoản"
              value={fromAccountId}
              onChange={setFromAccountId}
              options={accountsWithOptions}
              required
            />
          </>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-3 px-4 font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 text-base"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu Giao dịch"}
          </button>
        </div>
      </div>
    </form>
  );
}

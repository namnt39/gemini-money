"use client";

import { useMemo } from "react";

import { createTranslator } from "@/lib/i18n";
import type { TransactionRecord } from "@/lib/transactions";
import { numberToVietnameseWords } from "@/lib/numberToVietnameseWords";

const amountFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatAmountPrefix(nature: TransactionRecord["nature"]) {
  if (nature === "IN") return "+";
  if (nature === "EX") return "-";
  return "";
}

function getAmountColor(nature: TransactionRecord["nature"]) {
  switch (nature) {
    case "IN":
      return "text-green-600";
    case "EX":
      return "text-red-600";
    case "TF":
      return "text-slate-500";
    case "DEBT":
      return "text-amber-600";
    default:
      return "text-slate-700";
  }
}

type TxnTableProps = {
  transactions: TransactionRecord[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export default function TxnTable({
  transactions,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: TxnTableProps) {
  const t = useMemo(() => createTranslator(), []);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePrev = () => {
    onPageChange(Math.max(1, page - 1));
  };

  const handleNext = () => {
    onPageChange(Math.min(totalPages, page + 1));
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        {t("transactions.empty.noData")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full table-fixed">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-left text-sm uppercase tracking-wide text-slate-500">
              <th className="px-6 py-4 font-semibold">{t("transactions.table.name")}</th>
              <th className="px-6 py-4 font-semibold">{t("transactions.table.date")}</th>
              <th className="px-6 py-4 font-semibold text-right">{t("transactions.table.amount")}</th>
              <th className="px-6 py-4 font-semibold">{t("transactions.table.status")}</th>
              <th className="px-6 py-4 font-semibold text-right">{t("transactions.table.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {transactions.map((transaction) => {
              const amountWords = numberToVietnameseWords(transaction.amount ?? 0);
              return (
                <tr key={transaction.id} className="transition hover:bg-indigo-50/40">
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {transaction.category?.name ?? transaction.shop?.name ?? "—"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {transaction.notes ?? transaction.shop?.name ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-slate-600">
                    {dateFormatter.format(new Date(transaction.date))}
                  </td>
                  <td className="px-6 py-4 align-top text-right">
                    <span
                      className={`text-base font-semibold ${getAmountColor(transaction.nature)}`}
                      title={amountWords ?? ""}
                    >
                      {formatAmountPrefix(transaction.nature)}
                      {amountFormatter.format(transaction.amount ?? 0)}
                    </span>
                    {transaction.cashback_amount ? (
                      <span className="block text-xs text-emerald-600">
                        Cashback: {amountFormatter.format(transaction.cashback_amount)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {transaction.status}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {t(`transactions.nature.${transaction.nature === "DEBT" ? "debt" : transaction.nature === "TF" ? "transfer" : transaction.nature === "IN" ? "income" : "expense"}` as never)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        {t("common.details")}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {t("common.edit")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {transactions.map((transaction) => {
          const amountWords = numberToVietnameseWords(transaction.amount ?? 0);
          return (
            <article
              key={transaction.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {transaction.category?.name ?? transaction.shop?.name ?? "—"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {dateFormatter.format(new Date(transaction.date))}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`block text-base font-semibold ${getAmountColor(transaction.nature)}`}
                    title={amountWords ?? ""}
                  >
                    {formatAmountPrefix(transaction.nature)}
                    {amountFormatter.format(transaction.amount ?? 0)}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {transaction.status}
                  </span>
                </div>
              </div>
              {transaction.notes ? (
                <p className="mt-2 text-sm text-slate-600">{transaction.notes}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {transaction.from_account ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {transaction.from_account.name}
                  </span>
                ) : null}
                {transaction.to_account ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {transaction.to_account.name}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="ml-auto inline-flex items-center rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600"
                >
                  {t("common.details")}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600">
            {t("transactions.filters.pageSize")}
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={handlePrev}
            disabled={page <= 1}
            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("transactions.pagination.previous")}
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={page >= totalPages}
            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("transactions.pagination.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

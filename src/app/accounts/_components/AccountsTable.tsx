"use client";

import { createTranslator } from "@/lib/i18n";

import { formatAccountType, formatCashback, formatCreditLimit, formatCreatedAt } from "./account-utils";
import type { AccountRecord, SortColumn, SortState } from "./types";

type AccountsTableProps = {
  accounts: AccountRecord[];
  sort: SortState;
  onSortChange: (column: SortColumn) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (account: AccountRecord) => void;
  onDelete: (account: AccountRecord) => void;
};

const TableHeaderButton = ({
  label,
  column,
  sort,
  onSortChange,
}: {
  label: string;
  column: SortColumn;
  sort: SortState;
  onSortChange: (column: SortColumn) => void;
}) => {
  const isActive = sort.column === column;
  const direction = isActive ? sort.direction : "asc";
  const icon = direction === "asc" ? "▲" : "▼";

  return (
    <button
      type="button"
      onClick={() => onSortChange(column)}
      className={`group inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
        isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      <span className={`text-[10px] transition ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>{icon}</span>
    </button>
  );
};

const PaginationButton = ({
  disabled,
  onClick,
  children,
  label,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
      disabled
        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
        : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
    }`}
    aria-label={label}
  >
    {children}
  </button>
);

export default function AccountsTable({
  accounts,
  sort,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  onEdit,
  onDelete,
}: AccountsTableProps) {
  const t = createTranslator();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(total, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="relative w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left" aria-sort={sort.column === "name" ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  <TableHeaderButton
                    label={t("accounts.table.account")}
                    column="name"
                    sort={sort}
                    onSortChange={onSortChange}
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left" aria-sort={sort.column === "type" ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  <TableHeaderButton
                    label={t("accounts.type")}
                    column="type"
                    sort={sort}
                    onSortChange={onSortChange}
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left" aria-sort={sort.column === "credit_limit" ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  <TableHeaderButton
                    label={t("accounts.creditLimit")}
                    column="credit_limit"
                    sort={sort}
                    onSortChange={onSortChange}
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("accounts.cashback")}
                </th>
                <th scope="col" className="px-4 py-3 text-left" aria-sort={sort.column === "created_at" ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                  <TableHeaderButton
                    label={t("accounts.created")}
                    column="created_at"
                    sort={sort}
                    onSortChange={onSortChange}
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    {t("common.noData")}
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const typeLabel = formatAccountType(account.type, t("accounts.notAvailable"));
                  const creditLimitLabel = formatCreditLimit(account.credit_limit, t("accounts.notAvailable"));
                  const cashbackLabel = formatCashback(account, {
                    cashbackNotEligible: t("accounts.cashbackNotEligible"),
                    notAvailable: t("accounts.notAvailable"),
                  });
                  const createdLabel = formatCreatedAt(account.created_at ?? null, t("accounts.notAvailable"));

                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{account.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{typeLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{creditLimitLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{cashbackLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{createdLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(account)}
                            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(account)}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-rose-500 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                          >
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {total === 0
            ? t("accounts.table.empty")
            : t("accounts.table.pagination", { start: startItem, end: endItem, total })}
        </p>
        <div className="flex items-center gap-2">
          <PaginationButton
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            label={t("accounts.table.previous")}
          >
            {t("common.previous")}
          </PaginationButton>
          <span className="text-sm font-medium text-gray-600">
            {t("accounts.table.page", { page, total: totalPages })}
          </span>
          <PaginationButton
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            label={t("accounts.table.next")}
          >
            {t("common.next")}
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

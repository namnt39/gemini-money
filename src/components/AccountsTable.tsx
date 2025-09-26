"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RemoteImage from "@/components/RemoteImage";
import { createTranslator } from "@/lib/i18n";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

const formatAccountType = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const cleaned = value.replace(/[_-]+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const formatCreditLimit = (value: number | null | undefined, fallback: string) => {
  if (value == null || Number.isNaN(value)) {
    return fallback;
  }
  return currencyFormatter.format(value);
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const fixed = Number.parseFloat(value.toString());
  if (Number.isNaN(fixed)) {
    return null;
  }
  const normalized = Math.abs(fixed) <= 1 ? fixed * 100 : fixed;
  const rounded = Number(normalized.toFixed(2));
  const stringValue = Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(1);
  return `${stringValue.replace(/\.0$/, "")}%`;
};

const formatCashback = (
  account: Account,
  t: ReturnType<typeof createTranslator>
) => {
  if (!account.is_cashback_eligible) {
    return t("accounts.cashbackNotEligible");
  }

  const percentLabel = formatPercent(account.cashback_percentage ?? null);
  const amountLabel =
    account.max_cashback_amount != null && !Number.isNaN(account.max_cashback_amount)
      ? currencyFormatter.format(account.max_cashback_amount)
      : null;

  const parts = [percentLabel, amountLabel].filter((part): part is string => Boolean(part));
  if (parts.length === 0) {
    return t("accounts.notAvailable");
  }
  return parts.join(" • ");
};

const formatCreatedAt = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return dateFormatter.format(parsed);
};

type Account = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  credit_limit: number | null;
  created_at?: string | null;
  is_cashback_eligible?: boolean | null;
  cashback_percentage?: number | null;
  max_cashback_amount?: number | null;
};

type AccountsTableProps = {
  accounts: Account[];
};

export default function AccountsTable({ accounts }: AccountsTableProps) {
  const t = createTranslator();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(accounts[0]?.id ?? null);

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId(null);
      return;
    }
    if (!selectedAccountId || !accounts.some((account) => account.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  const selectedAccountDetails = useMemo(() => {
    if (!selectedAccount) {
      return null;
    }
    return {
      typeLabel: formatAccountType(selectedAccount.type, t("accounts.notAvailable")),
      creditLimitLabel: formatCreditLimit(selectedAccount.credit_limit, t("accounts.notAvailable")),
      cashbackLabel: formatCashback(selectedAccount, t),
      createdLabel: formatCreatedAt(selectedAccount.created_at ?? null, t("accounts.notAvailable")),
    };
  }, [selectedAccount, t]);

  const handleSelectAccount = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
  }, []);

  const handleEditAccount = useCallback((account: Account) => {
    alert(`Editing ${account.name} is coming soon.`);
  }, []);

  const handleDeleteAccount = useCallback((account: Account) => {
    alert(`Deleting ${account.name} is not supported in this demo.`);
  }, []);

  const summaryLabel = useMemo(() => {
    const count = accounts.length;
    return count === 1 ? "1 account" : `${count} accounts`;
  }, [accounts.length]);

  if (!accounts.length) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6 xl:flex-row">
      <aside className="flex w-full flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm xl:w-80">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account details</h3>
        {selectedAccount && selectedAccountDetails ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {selectedAccount.image_url ? (
                <RemoteImage
                  src={selectedAccount.image_url}
                  alt={selectedAccount.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-base font-semibold uppercase text-indigo-700">
                  {getInitials(selectedAccount.name)}
                </span>
              )}
              <div>
                <p className="text-base font-semibold text-gray-900">{selectedAccount.name}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">{selectedAccountDetails.typeLabel}</p>
              </div>
            </div>
            <dl className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-500">{t("accounts.type")}</dt>
                <dd>{selectedAccountDetails.typeLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-500">{t("accounts.creditLimit")}</dt>
                <dd>{selectedAccountDetails.creditLimitLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-500">{t("accounts.cashback")}</dt>
                <dd>{selectedAccountDetails.cashbackLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-medium text-gray-500">{t("accounts.created")}</dt>
                <dd>{selectedAccountDetails.createdLabel}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleEditAccount(selectedAccount)}
                className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAccount(selectedAccount)}
                className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Select an account to view details.</p>
        )}
      </aside>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
          <span>{summaryLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">
                  {t("accounts.name")}
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">
                  {t("accounts.type")}
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">
                  {t("accounts.creditLimit")}
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">
                  {t("accounts.cashback")}
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-gray-600">
                  {t("accounts.created")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {accounts.map((account) => {
                const typeLabel = formatAccountType(account.type, t("accounts.notAvailable"));
                const creditLimitLabel = formatCreditLimit(account.credit_limit, t("accounts.notAvailable"));
                const cashbackLabel = formatCashback(account, t);
                const createdLabel = formatCreatedAt(account.created_at ?? null, t("accounts.notAvailable"));
                const isActive = account.id === selectedAccountId;

                return (
                  <tr
                    key={account.id}
                    onClick={() => handleSelectAccount(account.id)}
                    className={`cursor-pointer transition hover:bg-indigo-50/40 ${isActive ? "bg-indigo-50/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {account.image_url ? (
                          <RemoteImage
                            src={account.image_url}
                            alt={account.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold uppercase text-indigo-700">
                            {getInitials(account.name)}
                          </span>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{account.name}</div>
                          <div className="text-xs text-gray-500">{account.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{creditLimitLabel}</td>
                    <td className="px-4 py-3 text-gray-700">{cashbackLabel}</td>
                    <td className="px-4 py-3 text-gray-700">{createdLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

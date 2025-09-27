"use client";

import RemoteImage from "@/components/RemoteImage";
import { createTranslator } from "@/lib/i18n";

import { formatAccountType, formatCashback, formatCreditLimit, formatCreatedAt, getInitials } from "./account-utils";
import type { AccountRecord } from "./types";

type AccountsCardsProps = {
  accounts: AccountRecord[];
  onEdit: (account: AccountRecord) => void;
  onDelete: (account: AccountRecord) => void;
  summaryLabel: string;
};

export default function AccountsCards({ accounts, onEdit, onDelete, summaryLabel }: AccountsCardsProps) {
  const t = createTranslator();

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{summaryLabel}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => {
          const typeLabel = formatAccountType(account.type, t("accounts.notAvailable"));
          const creditLimitLabel = formatCreditLimit(account.credit_limit, t("accounts.notAvailable"));
          const cashbackLabel = formatCashback(account, {
            cashbackNotEligible: t("accounts.cashbackNotEligible"),
            notAvailable: t("accounts.notAvailable"),
          });
          const createdLabel = formatCreatedAt(account.created_at ?? null, t("accounts.notAvailable"));

          return (
            <article
              key={account.id}
              className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <header className="flex items-start justify-between gap-4">
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
                    <h3 className="text-base font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{typeLabel}</p>
                  </div>
                </div>
                {account.is_cashback_eligible ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5 text-emerald-600"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 00-1.414 0L8.5 12.086 5.707 9.293a1 1 0 10-1.414 1.414l3.5 3.5a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t("accounts.cashback")}
                  </span>
                ) : null}
              </header>

              <dl className="grid gap-3 text-sm text-gray-600">
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("accounts.type")}</dt>
                  <dd>{typeLabel}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("accounts.creditLimit")}</dt>
                  <dd>{creditLimitLabel}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("accounts.cashback")}</dt>
                  <dd>{cashbackLabel}</dd>
                </div>
                <div className="space-y-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("accounts.created")}</dt>
                  <dd>{createdLabel}</dd>
                </div>
              </dl>

              <footer className="mt-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(account)}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-rose-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                >
                  {t("common.delete")}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

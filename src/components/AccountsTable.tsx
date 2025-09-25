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

  if (!accounts.length) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
        {t("common.noData")}
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
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

            return (
              <tr key={account.id} className="transition hover:bg-indigo-50/40">
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
  );
}

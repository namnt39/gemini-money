import type { AccountRecord } from "./types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const getInitials = (value: string) => {
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

export const formatAccountType = (value: string | null | undefined, fallback: string) => {
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

export const formatCreditLimit = (value: number | null | undefined, fallback: string) => {
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
  const stringValue = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${stringValue.replace(/\.0$/, "")}%`;
};

export const formatCashback = (
  account: AccountRecord,
  labels: { notAvailable: string; cashbackNotEligible: string }
) => {
  if (!account.is_cashback_eligible) {
    return labels.cashbackNotEligible;
  }
  const percentLabel = formatPercent(account.cashback_percentage ?? null);
  const amountLabel =
    account.max_cashback_amount != null && !Number.isNaN(account.max_cashback_amount)
      ? currencyFormatter.format(account.max_cashback_amount)
      : null;
  const parts = [percentLabel, amountLabel].filter((part): part is string => Boolean(part));
  if (parts.length === 0) {
    return labels.notAvailable;
  }
  return parts.join(" • ");
};

export const formatCreatedAt = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return dateFormatter.format(parsed);
};

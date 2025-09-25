export type TransactionNatureCode = "EX" | "IN" | "TF" | "DE";

const aliasMap: Record<string, TransactionNatureCode> = {
  EX: "EX",
  EXPENSE: "EX",
  EXPENSES: "EX",
  EXP: "EX",
  IN: "IN",
  INCOME: "IN",
  INCOMES: "IN",
  INC: "IN",
  TF: "TF",
  TR: "TF",
  TRANSFER: "TF",
  TRANSFERS: "TF",
  TRANS: "TF",
  DE: "DE",
  DEBT: "DE",
  DEBTS: "DE",
  DEBIT: "DE",
};

const databaseNatureMap: Record<TransactionNatureCode, string[]> = {
  EX: ["EX", "Expense", "Expenses"],
  IN: ["IN", "Income", "Incomes"],
  TF: ["TF", "Transfer", "Transfers"],
  DE: ["DE", "Debt", "Debts"],
};

export function normalizeTransactionNature(
  value?: string | null
): TransactionNatureCode | null {
  if (!value) {
    return null;
  }
  const key = value.toString().trim().toUpperCase();
  return aliasMap[key] ?? null;
}

export function resolveTransactionNature(
  value: string | null | undefined,
  fallback: TransactionNatureCode
): TransactionNatureCode {
  return normalizeTransactionNature(value) ?? fallback;
}

export function getDatabaseNatureCandidates(
  nature: TransactionNatureCode
): string[] {
  const candidates = databaseNatureMap[nature] ?? [nature];
  return Array.from(new Set(candidates.map((candidate) => candidate.trim()))).filter(Boolean);
}

export function includesTransferNature(value?: string | null): boolean {
  return normalizeTransactionNature(value) === "TF";
}

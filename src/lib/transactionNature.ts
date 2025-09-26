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
  EX: ["Expense", "Expenses", "EX"],
  IN: ["Income", "Incomes", "IN"],
  TF: ["Transfer", "Transfers", "TF"],
  DE: ["Debt", "Debts", "DE"],
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
  const seen = new Set<string>();
  const addCandidate = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
  };

  candidates.forEach((candidate) => {
    addCandidate(candidate);
    addCandidate(candidate.toUpperCase());
    addCandidate(candidate.toLowerCase());
  });

  addCandidate(nature);

  return Array.from(seen);
}

export function includesTransferNature(value?: string | null): boolean {
  return normalizeTransactionNature(value) === "TF";
}

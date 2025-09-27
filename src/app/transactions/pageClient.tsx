"use client";

import { useMemo, useState } from "react";

import AddTxnDialog from "@/components/transactions/AddTxnDialog";
import TxnFilters, { type TxnFilterState } from "@/components/transactions/TxnFilters";
import TxnTable from "@/components/transactions/TxnTable";
import { createTranslator } from "@/lib/i18n";
import type {
  BasicOption,
  CategoryOption,
  TransactionRecord,
} from "@/lib/transactions";

const DEFAULT_FILTERS: TxnFilterState = {
  nature: "ALL",
  search: "",
  quickRange: null,
  dateFrom: null,
  dateTo: null,
  accountId: null,
  categoryId: null,
  status: null,
};

type PageClientProps = {
  initialTransactions: TransactionRecord[];
  accounts: BasicOption[];
  categories: CategoryOption[];
  shops: BasicOption[];
  initialError?: string;
};

type FilteredResult = {
  data: TransactionRecord[];
  total: number;
};

function filterTransactions(transactions: TransactionRecord[], filters: TxnFilterState): FilteredResult {
  const search = filters.search.trim().toLowerCase();
  const fromTimestamp = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const toTimestamp = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  const filtered = transactions.filter((transaction) => {
    if (filters.nature !== "ALL" && transaction.nature !== filters.nature) {
      return false;
    }
    if (filters.accountId) {
      const matches =
        transaction.from_account?.id === filters.accountId ||
        transaction.to_account?.id === filters.accountId;
      if (!matches) {
        return false;
      }
    }
    if (filters.categoryId && transaction.category?.id !== filters.categoryId) {
      return false;
    }
    if (filters.status && transaction.status !== filters.status) {
      return false;
    }
    const transactionTime = new Date(transaction.date).getTime();
    if (fromTimestamp && transactionTime < fromTimestamp) {
      return false;
    }
    if (toTimestamp && transactionTime > toTimestamp) {
      return false;
    }
    if (search) {
      const haystacks = [
        transaction.notes,
        transaction.category?.name ?? null,
        transaction.shop?.name ?? null,
        transaction.from_account?.name ?? null,
        transaction.to_account?.name ?? null,
        transaction.person?.name ?? null,
      ];
      const hasMatch = haystacks.some((value) => value?.toLowerCase().includes(search));
      if (!hasMatch) {
        return false;
      }
    }
    return true;
  });

  const sorted = filtered.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return { data: sorted, total: sorted.length };
}

export default function TransactionsPageClient({
  initialTransactions,
  accounts,
  categories,
  shops,
  initialError,
}: PageClientProps) {
  const t = useMemo(() => createTranslator(), []);
  const [filters, setFilters] = useState<TxnFilterState>(DEFAULT_FILTERS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(initialTransactions);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => filterTransactions(transactions, filters), [transactions, filters]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.data.slice(start, end);
  }, [filtered.data, page, pageSize]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(transactions.map((transaction) => transaction.status).filter(Boolean))
    ) as string[];
  }, [transactions]);

  const handleFilterChange = (patch: Partial<TxnFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleCreated = (transaction: TransactionRecord) => {
    setTransactions((prev) => [transaction, ...prev]);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("transactions.title")}</h1>
          <p className="text-sm text-slate-500">{t("transactions.filters.sectionTitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-500"
        >
          {t("transactions.addButton" as never)}
        </button>
      </div>

      {initialError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {initialError}
        </p>
      ) : null}

      <TxnFilters
        filters={filters}
        accounts={accounts}
        categories={categories}
        statuses={statuses}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      <TxnTable
        transactions={paginated}
        page={page}
        pageSize={pageSize}
        total={filtered.total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <AddTxnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accounts={accounts}
        categories={categories}
        shops={shops}
        onCreated={handleCreated}
      />
    </div>
  );
}

import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";

import TransactionsView from "./TransactionsView";

type NatureFilter = "all" | "income" | "expense" | "transfer";
type MonthFilter = number | "all";
type QuarterFilter = number | "all";

type TransactionFilters = {
  nature: NatureFilter;
  year: number;
  month: MonthFilter;
  quarter: QuarterFilter;
  accountId: string;
  page: number;
  pageSize: number;
};

type TransactionQueryRow = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  from_account?: { id: string | null; name: string | null; image_url: string | null } | null;
  to_account?: { id: string | null; name: string | null; image_url: string | null } | null;
  subcategories?: {
    id: string;
    name: string | null;
    categories?:
      | { name: string | null; transaction_nature?: string | null }[]
      | { name: string | null; transaction_nature?: string | null }
      | null;
  } | null;
};

type TransactionListItem = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  fromAccount?: { id: string | null; name: string | null; image_url: string | null } | null;
  toAccount?: { id: string | null; name: string | null; image_url: string | null } | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  transactionNature?: string | null;
};

type AccountRecord = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const natureCodeMap: Record<Exclude<NatureFilter, "all">, string> = {
  income: "IN",
  expense: "EX",
  transfer: "TR",
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

function parseNumber(value: string | undefined, fallback: number, min?: number, max?: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (min != null && parsed < min) return fallback;
  if (max != null && parsed > max) return fallback;
  return parsed;
}

function sanitizeFilters(searchParams?: Record<string, string | string[] | undefined>): TransactionFilters {
  const params = searchParams ?? {};

  const rawNature = typeof params.nature === "string" ? params.nature.toLowerCase() : "all";
  const nature: NatureFilter = ["all", "income", "expense", "transfer"].includes(rawNature)
    ? (rawNature as NatureFilter)
    : "all";

  const year = parseNumber(typeof params.year === "string" ? params.year : undefined, currentYear, 1970, currentYear + 10);

  const monthParam = typeof params.month === "string" ? params.month.toLowerCase() : String(currentMonth);
  let month: MonthFilter;
  if (monthParam === "all") {
    month = "all";
  } else {
    const parsed = parseNumber(monthParam, currentMonth, 1, 12);
    month = parsed;
  }

  const quarterParam = typeof params.quarter === "string" ? params.quarter.toLowerCase() : String(currentQuarter);
  let quarter: QuarterFilter;
  if (quarterParam === "all") {
    quarter = "all";
  } else {
    const parsed = parseNumber(quarterParam, currentQuarter, 1, 4);
    quarter = parsed;
  }

  const accountId = typeof params.accountId === "string" ? params.accountId : "";

  const page = parseNumber(typeof params.page === "string" ? params.page : undefined, 1, 1);

  const rawPageSize = parseNumber(
    typeof params.pageSize === "string" ? params.pageSize : undefined,
    DEFAULT_PAGE_SIZE,
    1
  );
  const pageSize = PAGE_SIZE_OPTIONS.includes(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE;

  return {
    nature,
    year,
    month,
    quarter,
    accountId,
    page,
    pageSize,
  };
}

function getDateRange(filters: TransactionFilters) {
  const { year, month, quarter } = filters;
  let start = new Date(year, 0, 1);
  let end = new Date(year + 1, 0, 1);

  if (quarter !== "all") {
    const startMonth = (quarter - 1) * 3;
    start = new Date(year, startMonth, 1);
    end = new Date(year, startMonth + 3, 1);
  }

  if (month !== "all") {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

async function fetchTransactions(filters: TransactionFilters): Promise<{ rows: TransactionListItem[]; count: number }> {
  const { start, end } = getDateRange(filters);

  let query = supabase
    .from("transactions")
    .select(
      `
        id,
        date,
        amount,
        notes,
        from_account_id,
        to_account_id,
        from_account:accounts!from_account_id ( id, name, image_url ),
        to_account:accounts!to_account_id ( id, name, image_url ),
        subcategories (
          id,
          name,
          categories (
            name,
            transaction_nature
          )
        )
      `,
      { count: "exact" }
    )
    .order("date", { ascending: false })
    .gte("date", start)
    .lt("date", end);

  if (filters.accountId) {
    query = query.or(`from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`);
  }

  if (filters.nature !== "all") {
    const natureCode = natureCodeMap[filters.nature];
    query = query.eq("categories.transaction_nature", natureCode, { foreignTable: "subcategories" });
  }

  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize - 1;
  query = query.range(startIndex, endIndex);

  const { data, count, error } = await query;

  if (error) {
    console.error("Failed to fetch transactions:", error);
    return { rows: [], count: 0 };
  }

  const rows = (data as TransactionQueryRow[]) || [];
  const mapped: TransactionListItem[] = rows.map((row) => {
    const subcategory = row.subcategories;
    const rawCategories = subcategory?.categories;
    const parentCategory = Array.isArray(rawCategories) ? rawCategories[0] : rawCategories ?? null;
    const transactionNature = parentCategory?.transaction_nature ?? null;

    return {
      id: row.id,
      date: row.date,
      amount: row.amount,
      notes: row.notes,
      fromAccount: row.from_account ?? null,
      toAccount: row.to_account ?? null,
      categoryName: parentCategory?.name ?? null,
      subcategoryName: subcategory?.name ?? null,
      transactionNature,
    };
  });

  return { rows: mapped, count: count ?? mapped.length };
}

async function fetchAccounts(): Promise<AccountRecord[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, image_url, type")
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch accounts:", error);
    return [];
  }

  return (data as AccountRecord[]) || [];
}

type TransactionsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const filters = sanitizeFilters(searchParams);
  const t = createTranslator();

  const [{ rows, count }, accounts] = await Promise.all([
    fetchTransactions(filters),
    fetchAccounts(),
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{t("transactions.title")}</h1>
        <Link
          href="/transactions/add"
          className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          {t("transactions.addButton")}
        </Link>
      </div>

      <TransactionsView
        transactions={rows}
        totalCount={count}
        accounts={accounts}
        filters={filters}
      />
    </div>
  );
}

export type { TransactionListItem, TransactionFilters, AccountRecord };

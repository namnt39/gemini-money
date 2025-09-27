import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import { getMockAccounts, getMockTransactions } from "@/data/mockData";
import { getDatabaseNatureCandidates, normalizeTransactionNature } from "@/lib/transactionNature";

import TransactionsView from "./TransactionsView";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, natureCodeMap } from "./constants";
import { loadTransactionFormData } from "./add/formData";

import type {
  AccountRecord,
  MonthFilter,
  NatureFilter,
  QuarterFilter,
  TransactionFilters,
  TransactionListItem,
} from "./types";

type TransactionQueryRow = {
  id: string;
  date: string;
  amount: number;
  final_price: number | null;
  cashback_percent: number | null;
  cashback_amount: number | null;
  notes: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  person_id: string | null;
  subcategory_id: string | null;
  shop_id: string | null;
  debt_tag: string | null;
  debt_cycle_tag: string | null;
  from_account?: { id: string | null; name: string | null; image_url: string | null } | null;
  to_account?: { id: string | null; name: string | null; image_url: string | null } | null;
  person?: { id: string | null; name: string | null; image_url: string | null } | null;
  subcategories?: {
    id: string;
    name: string | null;
    categories?:
      | { name: string | null; transaction_nature?: string | null }[]
      | { name: string | null; transaction_nature?: string | null }
      | null;
  } | null;
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

function isPageSizeOption(value: number): value is (typeof PAGE_SIZE_OPTIONS)[number] {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

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
  const personId = typeof params.personId === "string" ? params.personId : undefined;
  const searchTerm = typeof params.search === "string" ? params.search : "";

  const page = parseNumber(typeof params.page === "string" ? params.page : undefined, 1, 1);

  const rawPageSize = parseNumber(
    typeof params.pageSize === "string" ? params.pageSize : undefined,
    DEFAULT_PAGE_SIZE,
    1
  );
  const pageSize = isPageSizeOption(rawPageSize) ? rawPageSize : DEFAULT_PAGE_SIZE;

  return {
    nature,
    year,
    month,
    quarter,
    accountId,
    personId,
    searchTerm,
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

async function fetchTransactions(
  filters: TransactionFilters
): Promise<{ rows: TransactionListItem[]; count: number; errorMessage?: string }> {
  const supabaseClient = supabase;

  if (!supabaseClient) {
    const fallback = getMockTransactions(filters);
    const detail = supabaseConfigurationError?.message;
    const message = detail ? `${fallback.message} (${detail})` : fallback.message;
    console.warn(message);
    return { rows: fallback.rows, count: fallback.count, errorMessage: message };
  }

  const { start, end } = getDateRange(filters);

  let query = supabaseClient
    .from("transactions")
    .select(
      `
        id,
        date,
        amount,
        final_price,
        cashback_percent,
        cashback_amount,
        notes,
        from_account_id,
        to_account_id,
        person_id,
        subcategory_id,
        shop_id,
        debt_tag,
        debt_cycle_tag,
        from_account:accounts!from_account_id ( id, name, image_url ),
        to_account:accounts!to_account_id ( id, name, image_url ),
        person:people!person_id ( id, name, image_url ),
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
    const candidates = getDatabaseNatureCandidates(natureCode);
    if (candidates.length > 0) {
      query = query.in("subcategories.categories.transaction_nature", candidates);
    }
    if (filters.nature === "transfer") {
      query = query.not("from_account_id", "is", null).not("to_account_id", "is", null);
    }
  }

  if (filters.personId) {
    query = query.eq("person_id", filters.personId);
  }

  const normalizedSearch = filters.searchTerm.trim();
  if (normalizedSearch) {
    const escaped = normalizedSearch.replace(/[%_]/g, (match) => `\\${match}`);
    const likePattern = `%${escaped}%`;
    query = query.or(
      [
        `notes.ilike.${likePattern}`,
        `subcategories.name.ilike.${likePattern}`,
        `subcategories.categories.name.ilike.${likePattern}`,
        `from_account.name.ilike.${likePattern}`,
        `to_account.name.ilike.${likePattern}`,
        `person.name.ilike.${likePattern}`,
      ].join(",")
    );
  }

  const startIndex = (filters.page - 1) * filters.pageSize;
  const endIndex = startIndex + filters.pageSize - 1;
  query = query.range(startIndex, endIndex);

  const { data, count, error } = await query.returns<TransactionQueryRow[]>();

  if (error) {
    console.warn("Failed to fetch transactions from Supabase. Using demo data.", error?.message);
    const fallback = getMockTransactions(filters);
    return { rows: fallback.rows, count: fallback.count, errorMessage: fallback.message };
  }

  const rows: TransactionQueryRow[] = data ?? [];
  const mapped: TransactionListItem[] = rows.map((row) => {
    const subcategory = row.subcategories;
    const rawCategories = subcategory?.categories;
    const parentCategory = Array.isArray(rawCategories) ? rawCategories[0] : rawCategories ?? null;
    const transactionNature = normalizeTransactionNature(parentCategory?.transaction_nature ?? null) ?? null;

    return {
      id: row.id,
      date: row.date,
      amount: row.amount,
      finalPrice: row.final_price ?? null,
      cashbackPercent: row.cashback_percent ?? null,
      cashbackAmount: row.cashback_amount ?? null,
      cashbackSource:
        row.cashback_percent != null && !Number.isNaN(row.cashback_percent)
          ? "percent"
          : row.cashback_amount != null && !Number.isNaN(row.cashback_amount)
            ? "amount"
            : null,
      notes: row.notes,
      fromAccountId: row.from_account_id,
      fromAccount: row.from_account ?? null,
      toAccountId: row.to_account_id,
      toAccount: row.to_account ?? null,
      personId: row.person_id,
      person: row.person ?? null,
      categoryName: parentCategory?.name ?? null,
      subcategoryName: subcategory?.name ?? null,
      subcategoryId: row.subcategory_id ?? subcategory?.id ?? null,
      shopId: row.shop_id ?? null,
      transactionNature,
      debtTag: row.debt_tag ?? null,
      debtCycleTag: row.debt_cycle_tag ?? null,
    };
  });

  return { rows: mapped, count: count ?? mapped.length };
}

async function fetchAccounts(): Promise<{ accounts: AccountRecord[]; errorMessage?: string }> {
  const supabaseClient = supabase;

  if (!supabaseClient) {
    const fallback = getMockAccounts();
    const detail = supabaseConfigurationError?.message;
    const message = detail ? `${fallback.message} (${detail})` : fallback.message;
    console.warn(message);
    return { accounts: fallback.accounts, errorMessage: message };
  }

  const { data, error } = await supabaseClient
    .from("accounts")
    .select("id, name, image_url, type")
    .order("name", { ascending: true });

  if (error) {
    console.warn("Failed to fetch accounts from Supabase. Using demo data.", error?.message);
    const fallback = getMockAccounts();
    return { accounts: fallback.accounts, errorMessage: fallback.message };
  }

  return { accounts: ((data as AccountRecord[]) ?? []) as AccountRecord[] };
}

type TransactionsPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

async function resolveSearchParams(
  input?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
) {
  if (!input) return {} as Record<string, string | string[] | undefined>;
  return input instanceof Promise ? await input : input;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const resolvedParams = await resolveSearchParams(searchParams);
  const filters = sanitizeFilters(resolvedParams);
  const t = createTranslator();

  const [transactionsResult, accountsResult, formData] = await Promise.all([
    fetchTransactions(filters),
    fetchAccounts(),
    loadTransactionFormData(),
  ]);

  const combinedError = transactionsResult.errorMessage || accountsResult.errorMessage;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{t("transactions.title")}</h1>
      </div>

      <TransactionsView
        transactions={transactionsResult.rows}
        totalCount={transactionsResult.count}
        accounts={accountsResult.accounts}
        filters={filters}
        errorMessage={combinedError}
        formAccounts={formData.accounts}
        formSubcategories={formData.subcategories}
        formPeople={formData.people}
        formShops={formData.shops}
      />
    </div>
  );
}

export type { TransactionListItem, TransactionFilters, AccountRecord } from "./types";

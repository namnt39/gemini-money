import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import { getMockTransactions } from "@/data/mockData";
import { getDatabaseNatureCandidates, normalizeTransactionNature } from "@/lib/transactionNature";

import PeopleView from "./PeopleView";
import { natureCodeMap } from "../transactions/constants";

import type {
  TransactionFilters,
  TransactionListItem,
  MonthFilter,
  QuarterFilter,
  NatureFilter,
} from "../transactions/types";
import type { PersonAggregate } from "./types";

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
  person?: { id: string | null; name: string | null; image_url: string | null } | null;
  subcategories?: {
    id: string;
    name: string | null;
    categories?: { name: string | null; transaction_nature?: string | null }[] | null;
  } | null;
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentQuarter = Math.floor((currentMonth - 1) / 3) + 1;

const parseNumber = (value: string | undefined, fallback: number, min?: number, max?: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (min != null && parsed < min) return fallback;
  if (max != null && parsed > max) return fallback;
  return parsed;
};

const sanitizeFilters = (searchParams?: Record<string, string | string[] | undefined>): TransactionFilters => {
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

  return {
    nature,
    year,
    month,
    quarter,
    accountId,
    personId,
    searchTerm,
    page: 1,
    pageSize: 50,
  };
};

const getDateRange = (filters: TransactionFilters) => {
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
};

const computePercentAmount = (amount?: number | null, percent?: number | null) => {
  if (amount == null || percent == null) {
    return 0;
  }
  const value = (amount * percent) / 100;
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
};

const mapRowToTransaction = (row: TransactionQueryRow): TransactionListItem => {
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
    fromAccount: null,
    toAccount: null,
    person: row.person ?? null,
    categoryName: parentCategory?.name ?? null,
    subcategoryName: subcategory?.name ?? null,
    transactionNature,
  };
};

const aggregatePeople = (transactions: TransactionListItem[]): PersonAggregate[] => {
  const map = new Map<string, PersonAggregate>();

  transactions.forEach((transaction) => {
    const personId = transaction.person?.id;
    const personName = transaction.person?.name;
    if (!personId || !personName) {
      return;
    }

    const existing = map.get(personId);
    const source = transaction.cashbackSource ?? null;
    const isAmountSource = source === "amount";
    const isPercentSource = source === "percent";
    const manualBack = isPercentSource ? 0 : transaction.cashbackAmount ?? 0;
    const percentBack = isAmountSource
      ? 0
      : computePercentAmount(transaction.amount, transaction.cashbackPercent ?? null);
    const totalBack = isPercentSource && transaction.cashbackAmount != null
      ? transaction.cashbackAmount
      : manualBack + percentBack;
    const finalPrice = transaction.finalPrice ?? transaction.amount;

    if (!existing) {
      map.set(personId, {
        id: personId,
        name: personName,
        imageUrl: transaction.person?.image_url ?? null,
        transactions: [transaction],
        totalTransactions: 1,
        totalAmount: transaction.amount ?? 0,
        totalBack,
        totalFinalPrice: finalPrice ?? 0,
        lastTransactionDate: transaction.date ?? null,
      });
      return;
    }

    existing.transactions.push(transaction);
    existing.totalTransactions += 1;
    existing.totalAmount += transaction.amount ?? 0;
    existing.totalBack += totalBack;
    existing.totalFinalPrice += finalPrice ?? 0;
    const existingTimestamp = existing.lastTransactionDate ? new Date(existing.lastTransactionDate).getTime() : 0;
    const currentTimestamp = transaction.date ? new Date(transaction.date).getTime() : 0;
    if (currentTimestamp > existingTimestamp) {
      existing.lastTransactionDate = transaction.date ?? existing.lastTransactionDate;
    }
  });

  const aggregated = Array.from(map.values()).map((entry) => ({
    ...entry,
    transactions: entry.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  }));

  return aggregated.sort((a, b) => a.name.localeCompare(b.name));
};

async function fetchPeopleData(
  filters: TransactionFilters
): Promise<{ people: PersonAggregate[]; errorMessage?: string }> {
  if (!supabase) {
    const fallback = getMockTransactions({ ...filters, page: 1, pageSize: 1000 });
    const rows = fallback.rows.filter((transaction) => transaction.person?.id);
    const aggregated = aggregatePeople(rows);
    const detail = supabaseConfigurationError?.message;
    const message = detail ? `${fallback.message} (${detail})` : fallback.message;
    return { people: aggregated, errorMessage: message };
  }

  const { start, end } = getDateRange(filters);

  let query = supabase
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
        person:people!person_id ( id, name, image_url ),
        subcategories (
          id,
          name,
          categories (
            name,
            transaction_nature
          )
        )
      `
    )
    .not("person_id", "is", null)
    .order("date", { ascending: false })
    .gte("date", start)
    .lt("date", end)
    .limit(1000);

  if (filters.accountId) {
    query = query.or(`from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`);
  }

  if (filters.nature !== "all") {
    const code = natureCodeMap[filters.nature];
    const candidates = getDatabaseNatureCandidates(code);
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
        `person.name.ilike.${likePattern}`,
      ].join(",")
    );
  }

  const { data, error } = await query.returns<TransactionQueryRow[]>();

  if (error) {
    const fallback = getMockTransactions({ ...filters, page: 1, pageSize: 1000 });
    const rows = fallback.rows.filter((transaction) => transaction.person?.id);
    const aggregated = aggregatePeople(rows);
    return { people: aggregated, errorMessage: fallback.message };
  }

  const rows = (data ?? []).map(mapRowToTransaction).filter((transaction) => transaction.person?.id);
  const aggregated = aggregatePeople(rows);
  return { people: aggregated };
}

type PeoplePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const t = createTranslator();
  const filters = sanitizeFilters(searchParams);

  const { people, errorMessage } = await fetchPeopleData(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{t("people.title")}</h1>
      </div>
      <PeopleView people={people} filters={filters} errorMessage={errorMessage} />
    </div>
  );
}

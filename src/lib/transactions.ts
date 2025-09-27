import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { numberToVietnameseWords } from "@/lib/numberToVietnameseWords";

export type TransactionNature = "IN" | "EX" | "TF" | "DEBT";

export type BasicOption = {
  id: string;
  name: string;
};

export type CategoryOption = BasicOption & {
  transaction_nature: TransactionNature;
};

export type TransactionRecord = {
  id: string;
  date: string;
  amount: number;
  final_price: number | null;
  notes: string | null;
  status: string;
  nature: TransactionNature;
  from_account: BasicOption | null;
  to_account: BasicOption | null;
  category: CategoryOption | null;
  shop: BasicOption | null;
  person: BasicOption | null;
  cashback_percent: number | null;
  cashback_amount: number | null;
  debt_tag: string | null;
  debt_cycle_tag: string | null;
};

export type ListTransactionsParams = {
  nature?: TransactionNature | "ALL";
  search?: string;
  accountId?: string | null;
  categoryId?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
};

export type ListTransactionsResult = {
  data: TransactionRecord[];
  total: number;
  error?: string;
};

export type TransactionSupportData = {
  accounts: BasicOption[];
  categories: CategoryOption[];
  shops: BasicOption[];
  people: BasicOption[];
  error?: string;
};

export type CreateTransactionPayload = {
  amount: number;
  date: string;
  nature: TransactionNature;
  notes?: string | null;
  finalPrice?: number | null;
  status?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  shopId?: string | null;
  personId?: string | null;
  cashbackPercent?: number | null;
  cashbackAmount?: number | null;
  debtTag?: string | null;
  debtCycleTag?: string | null;
};

export type CreateTransactionResult = {
  data?: TransactionRecord;
  error?: string;
};

type SupabaseTransactionRow = {
  id: string;
  date: string;
  amount: number | string;
  final_price: number | string | null;
  notes: string | null;
  status: string | null;
  nature: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  person_id: string | null;
  category_id: string | null;
  shop_id: string | null;
  cashback_percent: number | string | null;
  cashback_amount: number | string | null;
  debt_tag: string | null;
  debt_cycle_tag: string | null;
};

const fallbackAccounts: BasicOption[] = [
  { id: "acc-wallet", name: "Ví tiền mặt" },
  { id: "acc-credit", name: "Thẻ tín dụng" },
  { id: "acc-savings", name: "Tiết kiệm" },
  { id: "acc-salary", name: "Tài khoản lương" },
];

const fallbackCategories: CategoryOption[] = [
  { id: "cat-grocery", name: "Đi chợ", transaction_nature: "EX" },
  { id: "cat-salary", name: "Lương", transaction_nature: "IN" },
  { id: "cat-transfer", name: "Chuyển khoản", transaction_nature: "TF" },
  { id: "cat-debt", name: "Thu nợ", transaction_nature: "DEBT" },
];

const fallbackShops: BasicOption[] = [
  { id: "shop-coop", name: "Co.op Mart" },
  { id: "shop-grab", name: "Grab" },
  { id: "shop-book", name: "Book Haven" },
];

const fallbackPeople: BasicOption[] = [
  { id: "person-minh", name: "Minh" },
  { id: "person-linh", name: "Linh" },
];

let memoryTransactions: TransactionRecord[] = [
  {
    id: "txn-seed-1",
    date: new Date().toISOString(),
    amount: 320000,
    final_price: 320000,
    notes: "Mua thực phẩm cuối tuần",
    status: "Active",
    nature: "EX",
    from_account: fallbackAccounts[0],
    to_account: null,
    category: fallbackCategories[0],
    shop: fallbackShops[0],
    person: null,
    cashback_percent: 5,
    cashback_amount: 16000,
    debt_tag: null,
    debt_cycle_tag: null,
  },
  {
    id: "txn-seed-2",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 18500000,
    final_price: 18500000,
    notes: "Lương tháng",
    status: "Active",
    nature: "IN",
    from_account: null,
    to_account: fallbackAccounts[3],
    category: fallbackCategories[1],
    shop: null,
    person: null,
    cashback_percent: null,
    cashback_amount: null,
    debt_tag: null,
    debt_cycle_tag: null,
  },
  {
    id: "txn-seed-3",
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 2500000,
    final_price: 2500000,
    notes: "Chuyển tiền tiết kiệm",
    status: "Active",
    nature: "TF",
    from_account: fallbackAccounts[3],
    to_account: fallbackAccounts[2],
    category: fallbackCategories[2],
    shop: null,
    person: null,
    cashback_percent: null,
    cashback_amount: null,
    debt_tag: null,
    debt_cycle_tag: null,
  },
  {
    id: "txn-seed-4",
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 1200000,
    final_price: 1200000,
    notes: "Cho Minh mượn",
    status: "Active",
    nature: "DEBT",
    from_account: fallbackAccounts[0],
    to_account: null,
    category: fallbackCategories[3],
    shop: null,
    person: fallbackPeople[0],
    cashback_percent: null,
    cashback_amount: null,
    debt_tag: "MINH-2024",
    debt_cycle_tag: "2024-Q4",
  },
];

function parseNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNature(nature: string | null | undefined): TransactionNature {
  if (!nature) return "EX";
  const upper = nature.toUpperCase();
  if (upper === "IN" || upper === "EX" || upper === "TF" || upper === "DEBT") {
    return upper;
  }
  if (upper === "DE") {
    return "DEBT";
  }
  return "EX";
}

function buildOptionMap<T extends BasicOption>(options: T[]): Map<string, T> {
  return new Map(options.map((option) => [option.id, option]));
}

function mapRow(
  row: SupabaseTransactionRow,
  accountMap: Map<string, BasicOption>,
  categoryMap: Map<string, CategoryOption>,
  shopMap: Map<string, BasicOption>,
  peopleMap: Map<string, BasicOption>
): TransactionRecord {
  const amount = parseNumber(row.amount) ?? 0;
  const finalPrice = parseNumber(row.final_price);
  const cashbackPercent = parseNumber(row.cashback_percent);
  const cashbackAmount = parseNumber(row.cashback_amount);
  const category = row.category_id ? categoryMap.get(row.category_id) ?? null : null;
  const derivedNature = normalizeNature(row.nature ?? category?.transaction_nature ?? null);
  return {
    id: row.id,
    date: row.date,
    amount,
    final_price: finalPrice,
    notes: row.notes,
    status: row.status ?? "Active",
    nature: derivedNature,
    from_account: row.from_account_id ? accountMap.get(row.from_account_id) ?? null : null,
    to_account: row.to_account_id ? accountMap.get(row.to_account_id) ?? null : null,
    category,
    shop: row.shop_id ? shopMap.get(row.shop_id) ?? null : null,
    person: row.person_id ? peopleMap.get(row.person_id) ?? null : null,
    cashback_percent: cashbackPercent,
    cashback_amount: cashbackAmount,
    debt_tag: row.debt_tag,
    debt_cycle_tag: row.debt_cycle_tag,
  };
}

function filterTransactions(
  transactions: TransactionRecord[],
  params: ListTransactionsParams
): { data: TransactionRecord[]; total: number } {
  const {
    nature = "ALL",
    search = "",
    accountId,
    categoryId,
    status,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 10,
  } = params;

  const trimmedSearch = search.trim().toLowerCase();
  const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

  const filtered = transactions.filter((transaction) => {
    if (nature !== "ALL" && transaction.nature !== nature) {
      return false;
    }
    if (accountId) {
      const matchesAccount =
        transaction.from_account?.id === accountId || transaction.to_account?.id === accountId;
      if (!matchesAccount) {
        return false;
      }
    }
    if (categoryId && transaction.category?.id !== categoryId) {
      return false;
    }
    if (status && transaction.status !== status) {
      return false;
    }
    if (fromTimestamp && new Date(transaction.date).getTime() < fromTimestamp) {
      return false;
    }
    if (toTimestamp && new Date(transaction.date).getTime() > toTimestamp) {
      return false;
    }
    if (trimmedSearch) {
      const haystacks = [
        transaction.notes,
        transaction.category?.name ?? null,
        transaction.shop?.name ?? null,
        transaction.from_account?.name ?? null,
        transaction.to_account?.name ?? null,
        transaction.person?.name ?? null,
        numberToVietnameseWords(transaction.amount ?? 0),
      ];
      const hasMatch = haystacks.some((value) =>
        value ? value.toLowerCase().includes(trimmedSearch) : false
      );
      if (!hasMatch) {
        return false;
      }
    }
    return true;
  });

  const sorted = filtered.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    data: sorted.slice(startIndex, endIndex),
    total: sorted.length,
  };
}

async function fetchSupabaseSupportData(): Promise<[
  BasicOption[],
  CategoryOption[],
  BasicOption[],
  BasicOption[],
  string | undefined
]> {
  const client = supabase;
  if (!client) {
    const fallbackMessage = supabaseConfigurationError?.message;
    return [
      fallbackAccounts,
      fallbackCategories,
      fallbackShops,
      fallbackPeople,
      fallbackMessage ?? "Supabase client not configured.",
    ];
  }

  const [accountsRes, categoriesRes, shopsRes, peopleRes] = await Promise.all([
    client.from("accounts").select("id, name"),
    client
      .from("categories")
      .select("id, name, transaction_nature")
      .order("name", { ascending: true }),
    client.from("shops").select("id, name").order("name", { ascending: true }),
    client.from("people").select("id, name").order("name", { ascending: true }),
  ]);

  const errorMessage =
    accountsRes.error?.message ||
    categoriesRes.error?.message ||
    shopsRes.error?.message ||
    peopleRes.error?.message ||
    undefined;

  const accounts = accountsRes.data?.map((row) => ({ id: row.id, name: row.name ?? "" })) ?? [];
  const categories =
    categoriesRes.data?.map((row) => ({
      id: row.id,
      name: row.name ?? "",
      transaction_nature: normalizeNature(row.transaction_nature ?? "EX"),
    })) ?? [];
  const shops = shopsRes.data?.map((row) => ({ id: row.id, name: row.name ?? "" })) ?? [];
  const people = peopleRes.data?.map((row) => ({ id: row.id, name: row.name ?? "" })) ?? [];

  return [accounts, categories, shops, people, errorMessage];
}

export async function fetchTransactionSupportData(): Promise<TransactionSupportData> {
  const [accounts, categories, shops, people, errorMessage] = await fetchSupabaseSupportData();
  return { accounts, categories, shops, people, error: errorMessage };
}

export async function listTransactions(
  params: ListTransactionsParams
): Promise<ListTransactionsResult> {
  const client = supabase;
  if (!client) {
    const { data, total } = filterTransactions(memoryTransactions, params);
    return {
      data,
      total,
      error: supabaseConfigurationError?.message,
    };
  }

  const [accounts, categories, shops, people, supportError] = await fetchSupabaseSupportData();
  const accountMap = buildOptionMap(accounts);
  const categoryMap = buildOptionMap(categories);
  const shopMap = buildOptionMap(shops);
  const peopleMap = buildOptionMap(people);

  const { data, error } = await client
    .from("transactions")
    .select(
      "id, date, amount, final_price, notes, status, nature, from_account_id, to_account_id, person_id, category_id, shop_id, cashback_percent, cashback_amount, debt_tag, debt_cycle_tag"
    )
    .order("date", { ascending: false });

  if (error) {
    return {
      data: [],
      total: 0,
      error: error.message,
    };
  }

  const mapped =
    data?.map((row) => mapRow(row as SupabaseTransactionRow, accountMap, categoryMap, shopMap, peopleMap)) ?? [];

  const { data: filtered, total } = filterTransactions(mapped, params);
  return {
    data: filtered,
    total,
    error: supportError,
  };
}

function buildMockRecord(
  payload: CreateTransactionPayload,
  accounts: BasicOption[],
  categories: CategoryOption[],
  shops: BasicOption[],
  people: BasicOption[]
): TransactionRecord {
  const accountMap = buildOptionMap(accounts);
  const categoryMap = buildOptionMap(categories);
  const shopMap = buildOptionMap(shops);
  const peopleMap = buildOptionMap(people);

  return {
    id: `txn-${Date.now()}`,
    date: payload.date,
    amount: payload.amount,
    final_price: payload.finalPrice ?? payload.amount,
    notes: payload.notes ?? null,
    status: payload.status ?? "Active",
    nature: payload.nature,
    from_account: payload.fromAccountId ? accountMap.get(payload.fromAccountId) ?? null : null,
    to_account: payload.toAccountId ? accountMap.get(payload.toAccountId) ?? null : null,
    category: payload.categoryId ? categoryMap.get(payload.categoryId) ?? null : null,
    shop: payload.shopId ? shopMap.get(payload.shopId) ?? null : null,
    person: payload.personId ? peopleMap.get(payload.personId) ?? null : null,
    cashback_percent: payload.cashbackPercent ?? null,
    cashback_amount: payload.cashbackAmount ?? null,
    debt_tag: payload.debtTag ?? null,
    debt_cycle_tag: payload.debtCycleTag ?? null,
  };
}

export async function createTransaction(
  payload: CreateTransactionPayload
): Promise<CreateTransactionResult> {
  const client = supabase;

  if (!client) {
    const record = buildMockRecord(
      payload,
      fallbackAccounts,
      fallbackCategories,
      fallbackShops,
      fallbackPeople
    );
    memoryTransactions = [record, ...memoryTransactions];
    return {
      data: record,
    };
  }

  const insertPayload = {
    amount: payload.amount,
    date: payload.date,
    notes: payload.notes ?? null,
    final_price: payload.finalPrice ?? payload.amount,
    status: payload.status ?? "Active",
    nature: payload.nature,
    from_account_id: payload.fromAccountId ?? null,
    to_account_id: payload.toAccountId ?? null,
    category_id: payload.categoryId ?? null,
    shop_id: payload.shopId ?? null,
    person_id: payload.personId ?? null,
    cashback_percent: payload.cashbackPercent ?? null,
    cashback_amount: payload.cashbackAmount ?? null,
    debt_tag: payload.debtTag ?? null,
    debt_cycle_tag: payload.debtCycleTag ?? null,
  };

  const { data, error } = await client
    .from("transactions")
    .insert(insertPayload)
    .select(
      "id, date, amount, final_price, notes, status, nature, from_account_id, to_account_id, person_id, category_id, shop_id, cashback_percent, cashback_amount, debt_tag, debt_cycle_tag"
    )
    .maybeSingle();

  if (error || !data) {
    return { error: error?.message ?? "Unable to create transaction." };
  }

  const [accounts, categories, shops, people] = await fetchSupabaseSupportData();
  const accountMap = buildOptionMap(accounts);
  const categoryMap = buildOptionMap(categories);
  const shopMap = buildOptionMap(shops);
  const peopleMap = buildOptionMap(people);

  const record = mapRow(data as SupabaseTransactionRow, accountMap, categoryMap, shopMap, peopleMap);
  return { data: record };
}

export function resetMockTransactions() {
  memoryTransactions = [...memoryTransactions];
}

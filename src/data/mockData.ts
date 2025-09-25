import type {
  AccountRecord,
  TransactionFilters,
  TransactionListItem,
} from "@/app/transactions/types";
import { natureCodeMap } from "@/app/transactions/constants";

export type DashboardAccount = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  credit_limit: number | null;
  created_at: string;
  is_cashback_eligible: boolean | null;
  cashback_percentage: number | null;
  max_cashback_amount: number | null;
};

export type DashboardTransactionRecord = {
  amount: number;
  date: string;
  transactionNature: "IN" | "EX" | "TF";
};

type MockTransactionSeed = {
  id: string;
  date: string;
  amount: number;
  finalPrice: number | null;
  cashbackPercent: number | null;
  cashbackAmount: number | null;
  cashbackSource?: "percent" | "amount" | null;
  notes: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  person?: { id: string; name: string; image_url: string | null } | null;
  categoryName: string | null;
  subcategoryName: string | null;
  transactionNature: "IN" | "EX" | "TF";
};

type MockSubcategory = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature: "EX" | "IN" | "TF" | "DE";
  categories: { name: string; transaction_nature: "EX" | "IN" | "TF" | "DE" }[];
};

type MockPerson = {
  id: string;
  name: string;
  image_url: string | null;
  is_group: boolean;
};

const mockAccounts: DashboardAccount[] = [
  {
    id: "acc-cash-wallet",
    name: "Cash Wallet",
    image_url: null,
    type: "cash",
    credit_limit: null,
    created_at: "2024-01-05T08:30:00.000Z",
    is_cashback_eligible: false,
    cashback_percentage: null,
    max_cashback_amount: null,
  },
  {
    id: "acc-salary-account",
    name: "Salary Account",
    image_url: null,
    type: "bank",
    credit_limit: null,
    created_at: "2023-09-12T09:15:00.000Z",
    is_cashback_eligible: true,
    cashback_percentage: 1.5,
    max_cashback_amount: 200000,
  },
  {
    id: "acc-credit-card",
    name: "Vietcombank Platinum",
    image_url: null,
    type: "credit",
    credit_limit: 20000000,
    created_at: "2022-03-20T10:45:00.000Z",
    is_cashback_eligible: true,
    cashback_percentage: 3,
    max_cashback_amount: 500000,
  },
  {
    id: "acc-investment",
    name: "Investment Fund",
    image_url: null,
    type: "investment",
    credit_limit: null,
    created_at: "2021-07-01T07:00:00.000Z",
    is_cashback_eligible: false,
    cashback_percentage: null,
    max_cashback_amount: null,
  },
];

const mockTransactions: MockTransactionSeed[] = [
  {
    id: "tx-1001",
    date: "2024-11-05T12:20:00.000Z",
    amount: 1250000,
    finalPrice: 1250000,
    cashbackPercent: 3,
    cashbackAmount: 37500,
    cashbackSource: "percent",
    notes: "Weekly supermarket run",
    fromAccountId: "acc-credit-card",
    toAccountId: null,
    categoryName: "Groceries",
    subcategoryName: "Supermarket",
    transactionNature: "EX",
  },
  {
    id: "tx-1002",
    date: "2024-11-02T08:10:00.000Z",
    amount: 18000000,
    finalPrice: 18000000,
    cashbackPercent: null,
    cashbackAmount: null,
    notes: "Salary for November",
    fromAccountId: null,
    toAccountId: "acc-salary-account",
    categoryName: "Income",
    subcategoryName: "Salary",
    transactionNature: "IN",
  },
  {
    id: "tx-1003",
    date: "2024-10-28T18:40:00.000Z",
    amount: 3500000,
    finalPrice: 3500000,
    cashbackPercent: null,
    cashbackAmount: null,
    notes: "Rent payment",
    fromAccountId: "acc-salary-account",
    toAccountId: null,
    categoryName: "Housing",
    subcategoryName: "Rent",
    transactionNature: "EX",
  },
  {
    id: "tx-1004",
    date: "2024-10-15T15:05:00.000Z",
    amount: 2500000,
    finalPrice: 2500000,
    cashbackPercent: null,
    cashbackAmount: null,
    notes: "Transfer to investment fund",
    fromAccountId: "acc-salary-account",
    toAccountId: "acc-investment",
    categoryName: "Transfer",
    subcategoryName: "Investments",
    transactionNature: "TF",
  },
  {
    id: "tx-1005",
    date: "2024-09-12T09:00:00.000Z",
    amount: 450000,
    finalPrice: 450000,
    cashbackPercent: 1.5,
    cashbackAmount: 6750,
    cashbackSource: "percent",
    notes: "Coffee meetup",
    fromAccountId: "acc-cash-wallet",
    toAccountId: null,
    person: { id: "person-minh", name: "Minh Nguyen", image_url: null },
    categoryName: "Dining",
    subcategoryName: "Coffee",
    transactionNature: "EX",
  },
  {
    id: "tx-1006",
    date: "2024-08-30T13:25:00.000Z",
    amount: 5200000,
    finalPrice: 5200000,
    cashbackPercent: null,
    cashbackAmount: null,
    notes: "Freelance project payment",
    fromAccountId: null,
    toAccountId: "acc-salary-account",
    categoryName: "Income",
    subcategoryName: "Freelance",
    transactionNature: "IN",
  },
];

const mockSubcategories: MockSubcategory[] = [
  {
    id: "sub-supermarket",
    name: "Supermarket",
    image_url: null,
    transaction_nature: "EX",
    categories: [{ name: "Groceries", transaction_nature: "EX" }],
  },
  {
    id: "sub-salary",
    name: "Salary",
    image_url: null,
    transaction_nature: "IN",
    categories: [{ name: "Income", transaction_nature: "IN" }],
  },
  {
    id: "sub-investments",
    name: "Investments",
    image_url: null,
    transaction_nature: "TF",
    categories: [{ name: "Transfers", transaction_nature: "TF" }],
  },
  {
    id: "sub-rent",
    name: "Rent",
    image_url: null,
    transaction_nature: "EX",
    categories: [{ name: "Housing", transaction_nature: "EX" }],
  },
  {
    id: "sub-coffee",
    name: "Coffee",
    image_url: null,
    transaction_nature: "EX",
    categories: [{ name: "Dining", transaction_nature: "EX" }],
  },
  {
    id: "sub-freelance",
    name: "Freelance",
    image_url: null,
    transaction_nature: "IN",
    categories: [{ name: "Income", transaction_nature: "IN" }],
  },
];

const mockPeople: MockPerson[] = [
  { id: "person-minh", name: "Minh Nguyen", image_url: null, is_group: false },
  { id: "person-team", name: "Project Team", image_url: null, is_group: true },
];

function cloneAccounts(): DashboardAccount[] {
  return mockAccounts.map((account) => ({ ...account }));
}

function buildDateRange(filters: TransactionFilters) {
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

  return { start: start.getTime(), end: end.getTime() };
}

function mapToTransactionListItem(seed: MockTransactionSeed): TransactionListItem {
  const fromAccount = seed.fromAccountId
    ? mockAccounts.find((account) => account.id === seed.fromAccountId)
    : undefined;
  const toAccount = seed.toAccountId
    ? mockAccounts.find((account) => account.id === seed.toAccountId)
    : undefined;

  return {
    id: seed.id,
    date: seed.date,
    amount: seed.amount,
    finalPrice: seed.finalPrice,
    cashbackPercent: seed.cashbackPercent,
    cashbackAmount: seed.cashbackAmount,
    cashbackSource: seed.cashbackSource ?? null,
    notes: seed.notes,
    fromAccount: fromAccount
      ? { id: fromAccount.id, name: fromAccount.name, image_url: fromAccount.image_url }
      : null,
    toAccount: toAccount
      ? { id: toAccount.id, name: toAccount.name, image_url: toAccount.image_url }
      : null,
    person: seed.person ?? null,
    categoryName: seed.categoryName,
    subcategoryName: seed.subcategoryName,
    transactionNature: seed.transactionNature,
  };
}

function filterByAccount(seed: MockTransactionSeed, accountId: string) {
  if (!accountId) {
    return true;
  }
  return seed.fromAccountId === accountId || seed.toAccountId === accountId;
}

function filterByNature(seed: MockTransactionSeed, nature: TransactionFilters["nature"]) {
  if (nature === "all") {
    return true;
  }
  const expectedCode = natureCodeMap[nature];
  return seed.transactionNature === expectedCode;
}

export function getMockDashboardData(): {
  accounts: DashboardAccount[];
  transactions: DashboardTransactionRecord[];
  message: string;
} {
  return {
    accounts: cloneAccounts(),
    transactions: mockTransactions.map((transaction) => ({
      amount: transaction.amount,
      date: transaction.date,
      transactionNature: transaction.transactionNature,
    })),
    message: "Supabase connection unavailable. Displaying demo data.",
  };
}

export function getMockTransactions(
  filters: TransactionFilters
): { rows: TransactionListItem[]; count: number; message: string } {
  const { start, end } = buildDateRange(filters);
  const filtered = mockTransactions.filter((transaction) => {
    const timestamp = new Date(transaction.date).getTime();
    if (Number.isNaN(timestamp) || timestamp < start || timestamp >= end) {
      return false;
    }
    if (!filterByAccount(transaction, filters.accountId)) {
      return false;
    }
    if (!filterByNature(transaction, filters.nature)) {
      return false;
    }
    if (filters.personId && transaction.person?.id !== filters.personId) {
      return false;
    }
    const normalizedSearch = filters.searchTerm.trim().toLowerCase();
    if (normalizedSearch) {
      const haystacks = [
        transaction.notes,
        transaction.categoryName,
        transaction.subcategoryName,
        transaction.person?.name,
      ];
      const matches = haystacks.some((value) => value?.toLowerCase().includes(normalizedSearch));
      if (!matches) {
        return false;
      }
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const startIndex = Math.max(0, (filters.page - 1) * filters.pageSize);
  const endIndex = Math.max(startIndex, startIndex + filters.pageSize);
  const paginated = sorted.slice(startIndex, endIndex).map(mapToTransactionListItem);

  return {
    rows: paginated,
    count: sorted.length,
    message: "Supabase connection unavailable. Displaying demo transactions.",
  };
}

export function getMockTransactionFormData(): {
  accounts: DashboardAccount[];
  subcategories: MockSubcategory[];
  people: MockPerson[];
} {
  return {
    accounts: cloneAccounts(),
    subcategories: mockSubcategories.map((subcategory) => ({ ...subcategory })),
    people: mockPeople.map((person) => ({ ...person })),
  };
}

export function getMockAccounts(): { accounts: AccountRecord[]; message: string } {
  return {
    accounts: mockAccounts.map(({ id, name, image_url, type }) => ({
      id,
      name,
      image_url,
      type,
    })),
    message: "Supabase connection unavailable. Displaying demo accounts.",
  };
}

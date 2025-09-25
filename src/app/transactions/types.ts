export type NatureFilter = "all" | "income" | "expense" | "transfer";
export type MonthFilter = number | "all";
export type QuarterFilter = number | "all";

export type TransactionFilters = {
  nature: NatureFilter;
  year: number;
  month: MonthFilter;
  quarter: QuarterFilter;
  accountId: string;
  personId?: string;
  searchTerm: string;
  page: number;
  pageSize: number;
};

export type AccountRecord = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
};

export type TransactionListItem = {
  id: string;
  date: string;
  amount: number;
  finalPrice: number | null;
  cashbackPercent: number | null;
  cashbackAmount: number | null;
  cashbackSource?: "percent" | "amount" | null;
  notes: string | null;
  fromAccount?: { id: string | null; name: string | null; image_url: string | null } | null;
  toAccount?: { id: string | null; name: string | null; image_url: string | null } | null;
  person?: { id: string | null; name: string | null; image_url: string | null } | null;
  categoryName?: string | null;
  subcategoryName?: string | null;
  transactionNature?: string | null;
};

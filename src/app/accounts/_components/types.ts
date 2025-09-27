export type AccountRecord = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  credit_limit: number | null;
  created_at?: string | null;
  is_cashback_eligible?: boolean | null;
  cashback_percentage?: number | null;
  max_cashback_amount?: number | null;
};

export type SortColumn = "name" | "type" | "credit_limit" | "created_at";
export type SortDirection = "asc" | "desc";

export type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

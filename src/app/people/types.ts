import type { TransactionListItem } from "@/app/transactions/types";

export type PersonAggregate = {
  id: string;
  name: string;
  imageUrl: string | null;
  transactions: TransactionListItem[];
  totalTransactions: number;
  totalAmount: number;
  totalBack: number;
  totalFinalPrice: number;
  lastTransactionDate: string | null;
};

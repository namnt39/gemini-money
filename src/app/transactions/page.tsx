import type { Metadata } from "next";

import TransactionsPageClient from "./pageClient";

import { t } from "@/lib/i18n";
import {
  fetchTransactionSupportData,
  listTransactions,
} from "@/lib/transactions";

export const metadata: Metadata = {
  title: t("transactions.title"),
};

export default async function TransactionsPage() {
  const [listResult, supportData] = await Promise.all([
    listTransactions({ page: 1, pageSize: 100 }),
    fetchTransactionSupportData(),
  ]);

  const initialError = listResult.error ?? supportData.error;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-8 lg:px-8">
      <TransactionsPageClient
        initialTransactions={listResult.data}
        accounts={supportData.accounts}
        categories={supportData.categories}
        shops={supportData.shops}
        initialError={initialError}
      />
    </main>
  );
}

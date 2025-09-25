import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import AccountsTable from "@/components/AccountsTable";
import StatCard from "@/components/StatCard";
import { createTranslator } from "@/lib/i18n";
import { getMockDashboardData } from "@/data/mockData";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND" }).format(amount);
};
export type Account = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  credit_limit: number | null;
  created_at?: string;
  is_cashback_eligible: boolean | null;
  cashback_percentage: number | null;
  max_cashback_amount: number | null;
};

type TransactionRecord = {
  amount: number;
  date: string;
  subcategories?: {
    categories?: {
      transaction_nature?: string | null;
    } | null;
  } | null;
};

function buildFallbackDashboard(detail?: string) {
  const fallback = getMockDashboardData();
  const transactions = fallback.transactions.map<TransactionRecord>((transaction) => ({
    amount: transaction.amount,
    date: transaction.date,
    subcategories: {
      categories: {
        transaction_nature: transaction.transactionNature,
      },
    },
  }));
  const message = detail ? `${fallback.message} (${detail})` : fallback.message;
  return {
    accounts: fallback.accounts as Account[],
    transactions,
    message,
  };
}

export default async function Home() {
  const t = createTranslator();
  let accountsData: Account[] | null = null;
  let transactionsData: TransactionRecord[] | null = null;
  let errorMessage: string | undefined;

  if (!supabase) {
    const fallback = buildFallbackDashboard(supabaseConfigurationError?.message);
    accountsData = fallback.accounts;
    transactionsData = fallback.transactions;
    errorMessage = fallback.message;
    console.warn(errorMessage);
  } else {
    const [{ data: accountResponse, error: accountsError }, { data: transactionResponse, error: transactionsError }] =
      await Promise.all([
        supabase.from("accounts").select(),
        supabase
          .from("transactions")
          .select(`
        amount,
        date,
        subcategories (
          categories (
            transaction_nature
          )
        )
      `),
      ]);

    const hasErrors = Boolean(accountsError || transactionsError);

    if (hasErrors) {
      if (accountsError) {
        console.warn("Unable to fetch accounts from Supabase. Using demo data.", accountsError.message);
      }
      if (transactionsError) {
        console.warn("Unable to fetch transactions from Supabase. Using demo data.", transactionsError.message);
      }
      const fallback = buildFallbackDashboard();
      accountsData = fallback.accounts;
      transactionsData = fallback.transactions;
      errorMessage = fallback.message;
    } else {
      accountsData = (accountResponse as Account[]) || [];
      transactionsData = (transactionResponse as TransactionRecord[]) || [];
    }
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = transactionsData || [];

  const monthlyTransactions = transactions.filter(tx => new Date(tx.date) >= currentMonthStart);
  
  const totalIncomeThisMonth = monthlyTransactions
    .filter(tx => tx.subcategories?.categories?.transaction_nature === 'IN')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpenseThisMonth = monthlyTransactions
    .filter(tx => tx.subcategories?.categories?.transaction_nature === 'EX')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalIncomeAllTime = transactions
    .filter(tx => tx.subcategories?.categories?.transaction_nature === 'IN')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenseAllTime = transactions
    .filter(tx => tx.subcategories?.categories?.transaction_nature === 'EX')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const netWorth = totalIncomeAllTime - totalExpenseAllTime;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t("dashboard.title")}</h1>

      {errorMessage && (
        <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title={t("dashboard.incomeThisMonth")} value={formatCurrency(totalIncomeThisMonth)} type="income" />
        <StatCard title={t("dashboard.expenseThisMonth")} value={formatCurrency(totalExpenseThisMonth)} type="expense" />
        <StatCard title={t("dashboard.currentBalance")} value={formatCurrency(netWorth)} type="balance" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">{t("dashboard.accountsHeading")}</h2>
      <AccountsTable accounts={accountsData || []} />
    </div>
  );
}
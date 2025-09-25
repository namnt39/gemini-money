import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import AccountsTable from "@/components/AccountsTable";
import StatCard from "@/components/StatCard";
import { createTranslator } from "@/lib/i18n";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "VND" }).format(amount);
};
export type Account = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
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

export default async function Home() {
  const t = createTranslator();
  let accountsData: Account[] | null = null;
  let transactionsData: TransactionRecord[] | null = null;
  let errorMessage: string | undefined;

  if (!supabase) {
    errorMessage = supabaseConfigurationError?.message ?? "Supabase client is not configured.";
    console.error("Unable to load dashboard data:", errorMessage);
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

    if (accountsError) {
      errorMessage = accountsError.message || "Unable to fetch accounts.";
      console.error("Unable to fetch accounts:", accountsError);
    }

    if (transactionsError) {
      const message = transactionsError.message || "Unable to fetch transactions.";
      errorMessage = errorMessage ? `${errorMessage} ${message}` : message;
      console.error("Unable to fetch transactions:", transactionsError);
    }

    accountsData = (accountResponse as Account[]) || [];
    transactionsData = (transactionResponse as TransactionRecord[]) || [];
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
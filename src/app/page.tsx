import { supabase } from "@/lib/supabaseClient";
import AccountsTable from "@/components/AccountsTable";
import StatCard from "@/components/StatCard";
// SỬA Ở ĐÂY: Không cần import icon ở trang này nữa

// Hàm định dạng tiền tệ
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
  const { data: accountsData } = await supabase.from("accounts").select();
  const { data: transactionsData } = await supabase
    .from("transactions")
    .select(`
      amount,
      date,
      subcategories (
        categories (
          transaction_nature
        )
      )
    `);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const transactions = (transactionsData as TransactionRecord[]) || [];

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
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* SỬA Ở ĐÂY: Truyền 'type' thay vì 'icon' */}
        <StatCard title="Thu nhập Tháng này" value={formatCurrency(totalIncomeThisMonth)} type="income" />
        <StatCard title="Chi tiêu Tháng này" value={formatCurrency(totalExpenseThisMonth)} type="expense" />
        <StatCard title="Số dư Hiện tại" value={formatCurrency(netWorth)} type="balance" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Tài khoản
      </h2>
      <AccountsTable accounts={accountsData || []} />
    </div>
  );
}
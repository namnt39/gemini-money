import { supabase } from "@/lib/supabaseClient";
import DeleteButton from "@/app/transactions/DeleteButton";

async function getTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      date,
      amount,
      notes,
      from_account:accounts!from_account_id ( name ),
      to_account:accounts!to_account_id ( name ),
      subcategories ( name, categories ( name ) )
    `)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
  return data;
}

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Lịch sử Giao dịch</h1>
        <a 
          href="/transactions/add"
          className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          + Thêm mới
        </a>
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-gray-200 text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">Ngày</th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">Danh mục</th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">Tài khoản</th>
                <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">Ghi chú</th>
                <th className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900">Số tiền</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx: any) => (
                <tr key={tx.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700">{tx.subcategories?.categories?.name} / {tx.subcategories?.name}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700">{tx.from_account?.name || tx.to_account?.name}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-gray-700">{tx.notes}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <DeleteButton transactionId={tx.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
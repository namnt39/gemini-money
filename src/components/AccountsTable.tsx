import { createTranslator } from "@/lib/i18n";

type Account = {
  id: string;
  name: string;
  type: string | null;
  credit_limit: number | null;
  created_at: string;
};

type AccountsTableProps = {
  accounts: Account[];
};

export default function AccountsTable({ accounts }: AccountsTableProps) {
  const t = createTranslator();

  return (
    <div className="w-full mt-8">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                {t("accounts.name")}
              </th>
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                {t("accounts.type")}
              </th>
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-900">
                {t("accounts.creditLimit")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900">
                  {account.name}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                  {account.type || t("accounts.notAvailable")}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                  {account.credit_limit
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "VND",
                      }).format(account.credit_limit)
                    : t("accounts.notAvailable")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
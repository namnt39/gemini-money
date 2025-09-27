import AccountsTable from "@/components/AccountsTable";
import { getMockDashboardData } from "@/data/mockData";
import { createTranslator } from "@/lib/i18n";
import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type AccountRecord = {
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

async function loadAccounts(): Promise<{ accounts: AccountRecord[]; errorMessage?: string }> {
  const supabaseClient = supabase;
  if (!supabaseClient) {
    const fallback = getMockDashboardData();
    const detail = supabaseConfigurationError?.message;
    const message = detail ? `${fallback.message} (${detail})` : fallback.message;
    return { accounts: fallback.accounts as AccountRecord[], errorMessage: message };
  }

  const { data, error } = await supabaseClient.from("accounts").select();

  if (error || !data) {
    const fallback = getMockDashboardData();
    const detail = error?.message?.trim();
    const message = detail ? `${fallback.message} (${detail})` : fallback.message;
    return { accounts: fallback.accounts as AccountRecord[], errorMessage: message };
  }

  return { accounts: (data as AccountRecord[]) ?? [] };
}

export default async function AccountsPage() {
  const t = createTranslator();
  const { accounts, errorMessage } = await loadAccounts();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-800">{t("accountsPage.title")}</h1>
        <p className="text-sm text-gray-500">{t("accountsPage.description")}</p>
      </div>
      {errorMessage ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
      ) : null}
      <AccountsTable accounts={accounts} />
    </div>
  );
}

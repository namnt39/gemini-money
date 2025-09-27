import AccountsTabs from "./_components/AccountsTabs";
import type { AccountRecord } from "./_components/types";
import { getMockDashboardData } from "@/data/mockData";
import { createTranslator } from "@/lib/i18n";
import { supabase, supabaseConfigurationError } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

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
      <AccountsTabs accounts={accounts} errorMessage={errorMessage} />
    </div>
  );
}

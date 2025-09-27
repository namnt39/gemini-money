import { isSupabaseConfigured, supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import { normalizeTransactionNature } from "@/lib/transactionNature";
import CategoriesView from "./CategoriesView";

export type CategoryListItem = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  is_shop?: boolean | null;
};

type CategoriesResult = { categories: CategoryListItem[]; errorMessage?: string };

async function getCategories(): Promise<CategoriesResult> {
  const supabaseClient = supabase;

  if (!supabaseClient) {
    const message =
      supabaseConfigurationError?.message ?? "Supabase client is not configured.";
    console.error("Unable to fetch categories:", message);
    return { categories: [], errorMessage: message };
  }

  const { data, error } = await supabaseClient
    .from("categories")
    .select("id, name, image_url, transaction_nature, is_shop")
    .order("name", { ascending: true });

  let errorMessage: string | undefined;

  if (error) {
    errorMessage = error.message || "Unable to fetch categories.";
    console.error("Unable to fetch categories:", error);
  }

  type RawCategory = {
    id: string;
    name: string;
    image_url: string | null;
    transaction_nature?: string | null;
    is_shop?: boolean | null;
  };

  const typedCategories = ((data as RawCategory[]) ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    image_url: item.image_url ?? null,
    transaction_nature: normalizeTransactionNature(item.transaction_nature ?? null) ?? undefined,
    is_shop: typeof item.is_shop === "boolean" ? item.is_shop : item.is_shop ?? null,
  }));

  return { categories: typedCategories, errorMessage };
}

export default async function CategoriesPage() {
  const t = createTranslator();
  const result = await getCategories();
  const errorMessage = result.errorMessage || (!isSupabaseConfigured ? supabaseConfigurationError?.message : undefined);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">{t("categories.title")}</h1>
      <CategoriesView categories={result.categories} errorMessage={errorMessage} />
    </div>
  );
}

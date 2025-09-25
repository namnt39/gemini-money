import { isSupabaseConfigured, supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import CategoriesView from "./CategoriesView";

export type CategoryRecord = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories?: { transaction_nature?: string | null } | null;
};

type CategoriesResult = { categories: CategoryRecord[]; errorMessage?: string };

async function getCategories(): Promise<CategoriesResult> {
  if (!supabase) {
    const message =
      supabaseConfigurationError?.message ?? "Supabase client is not configured.";
    console.error("Unable to fetch subcategories:", message);
    return { categories: [], errorMessage: message };
  }

  const [{ data, error }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase
      .from("subcategories")
      .select("id, name, image_url, categories(transaction_nature)")
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, image_url, transaction_nature")
      .order("name", { ascending: true }),
  ]);

  let errorMessage: string | undefined;

  if (error) {
    errorMessage = error.message || "Unable to fetch subcategories.";
    console.error("Unable to fetch subcategories:", error);
  }

  if (categoriesError) {
    const message = categoriesError.message || "Unable to fetch categories.";
    errorMessage = errorMessage ? `${errorMessage} ${message}` : message;
    console.error("Unable to fetch categories:", categoriesError);
  }

  const typedSubcategories = (data as CategoryRecord[]) || [];
  const typedCategories = (categories as (CategoryRecord & { image_url?: string | null })[] | null) || [];

  const fallbackEntries = typedCategories.map((item) => ({
    ...item,
    categories: null,
  }));

  const combined = [...typedSubcategories];
  const existingIds = new Set(combined.map((item) => item.id));
  for (const fallback of fallbackEntries) {
    if (!existingIds.has(fallback.id)) {
      combined.push(fallback);
    }
  }

  return { categories: combined, errorMessage };
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

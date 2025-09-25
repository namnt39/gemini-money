import { isSupabaseConfigured, supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import { normalizeTransactionNature } from "@/lib/transactionNature";
import CategoriesView from "./CategoriesView";

type RawCategoryRelation = { id?: string | null; name?: string | null; transaction_nature?: string | null } | null;

export type CategoryRecord = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories?: RawCategoryRelation;
  categoryId: string;
  subcategoryId: string | null;
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
      .select("id, name, image_url, transaction_nature, category_id, categories(id, name, transaction_nature)")
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

  type RawSubcategory = {
    id: string;
    name: string;
    image_url: string | null;
    transaction_nature?: string | null;
    category_id?: string | null;
    categories?: RawCategoryRelation | RawCategoryRelation[];
  };

  const typedSubcategories = (data as RawSubcategory[]) || [];
  const normalizedSubcategories: CategoryRecord[] = typedSubcategories.map((item) => {
    const rawCategories = item.categories;
    const parentCategory = Array.isArray(rawCategories) ? rawCategories[0] : rawCategories ?? null;
    const parentId = parentCategory?.id ?? item.category_id ?? item.id;
    return {
      id: item.id,
      name: item.name,
      image_url: item.image_url ?? null,
      transaction_nature: normalizeTransactionNature(item.transaction_nature ?? null) ?? undefined,
      categories: parentCategory,
      categoryId: parentId ?? item.id,
      subcategoryId: item.id,
    };
  });

  type RawCategory = {
    id: string;
    name: string;
    image_url: string | null;
    transaction_nature?: string | null;
  };

  const typedCategories = (categories as RawCategory[] | null) || [];

  const fallbackEntries: CategoryRecord[] = typedCategories.map((item) => ({
    id: item.id,
    name: item.name,
    image_url: item.image_url ?? null,
    transaction_nature: normalizeTransactionNature(item.transaction_nature ?? null) ?? undefined,
    categories: {
      id: item.id,
      transaction_nature: normalizeTransactionNature(item.transaction_nature ?? null) ?? undefined,
    },
    categoryId: item.id,
    subcategoryId: null,
  }));

  const combined = [...normalizedSubcategories];
  const existingCategoryIds = new Set(combined.map((item) => item.categoryId));
  for (const fallback of fallbackEntries) {
    if (!existingCategoryIds.has(fallback.categoryId)) {
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

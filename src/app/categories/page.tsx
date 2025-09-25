import Link from "next/link";

import { isSupabaseConfigured, supabase, supabaseConfigurationError } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import RemoteImage from "@/components/RemoteImage";

type CategoryRecord = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories?: { transaction_nature?: string | null } | null;
};

const getNatureLabel = (value: string | undefined | null, t: ReturnType<typeof createTranslator>) => {
  if (!value) return t("categories.nature.unknown");
  const natureMap: Record<string, string> = {
    EX: t("categories.nature.EX"),
    IN: t("categories.nature.IN"),
    TR: t("categories.nature.TR"),
    DE: t("categories.nature.DE"),
  };
  return natureMap[value] ?? value;
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{t("categories.title")}</h1>
        <Link
          href="/categories/add"
          className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          {t("categories.addButton")}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {errorMessage && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {errorMessage}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">{t("categories.tableHeaders.icon")}</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">{t("categories.tableHeaders.name")}</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">{t("categories.tableHeaders.type")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.categories.map((category) => {
                const nature = category.transaction_nature ?? category.categories?.transaction_nature ?? undefined;
                return (
                  <tr key={category.id}>
                    <td className="px-4 py-3">
                      {category.image_url ? (
                        <RemoteImage
                          src={category.image_url}
                          alt={category.name}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-gray-200 flex items-center justify-center text-gray-500 text-xs uppercase">
                          {category.name.slice(0, 2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-gray-600">{getNatureLabel(nature, t)}</td>
                  </tr>
                );
              })}
              {result.categories.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                    {t("categories.emptyState")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

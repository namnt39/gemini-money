import { supabase } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import TransactionForm from "./TransactionForm";

export type Account = {
  id: string;
  name: string;
  image_url: string | null;
  type: string | null;
  is_cashback_eligible: boolean | null;
  cashback_percentage: number | null;
  max_cashback_amount: number | null;
};
type CategoryInfo = {
  name: string;
  transaction_nature: string;
};

export type Subcategory = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories: CategoryInfo[] | CategoryInfo | null;
};
type CategoryRecord = {
  id: string;
  name: string;
  transaction_nature: string;
  image_url?: string | null;
};

export type Person = {
  id: string;
  name: string;
  image_url: string | null;
  is_group: boolean | null;
};

async function getFormData() {
  const accountsPromise = supabase.from("accounts").select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabase
    .from("subcategories")
    .select("id, name, image_url, transaction_nature, categories(name, transaction_nature)");
  const peoplePromise = supabase.from("people").select("id, name, image_url, is_group");
  const categoriesPromise = supabase.from("categories").select("id, name, transaction_nature, image_url");

  const [
    { data: accounts, error: accountsError },
    { data: subcategories, error: subcategoriesError },
    { data: people, error: peopleError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([accountsPromise, subcategoriesPromise, peoplePromise, categoriesPromise]);

  if (accountsError) {
    console.error("Failed to fetch accounts:", accountsError);
  }
  if (subcategoriesError) {
    console.error("Failed to fetch subcategories:", subcategoriesError);
  }
  if (peopleError) {
    console.error("Failed to fetch people:", peopleError);
  }
  if (categoriesError) {
    console.error("Failed to fetch categories:", categoriesError);
  }

  const typedSubcategories = (subcategories as Subcategory[]) || [];
  const typedCategories = (categories as CategoryRecord[] | null) || [];

  const fallbackEntries = typedCategories.map((category) => ({
    id: category.id,
    name: category.name,
    image_url: category.image_url ?? null,
    transaction_nature: category.transaction_nature,
    categories: null,
  }));

  const combinedSubcategories = [...typedSubcategories];
  const existingIds = new Set(combinedSubcategories.map((item) => item.id));
  for (const entry of fallbackEntries) {
    if (!existingIds.has(entry.id)) {
      combinedSubcategories.push(entry);
    }
  }

  return {
    accounts: (accounts as Account[]) || [],
    subcategories: combinedSubcategories,
    people: (people as Person[]) || [],
  };
}

export default async function AddTransactionPage() {
  const t = createTranslator();
  const { accounts, subcategories, people } = await getFormData();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t("transactionForm.title")}</h1>
      <div className="bg-white rounded-lg shadow-md">
        <TransactionForm
          accounts={accounts}
          subcategories={subcategories}
          people={people}
        />
      </div>
    </div>
  );
}
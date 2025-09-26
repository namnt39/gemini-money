import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getMockTransactionFormData } from "@/data/mockData";
import { normalizeTransactionNature } from "@/lib/transactionNature";

type CategoryInfo = {
  name: string;
  transaction_nature: string;
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

export type Subcategory = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories: CategoryInfo[] | CategoryInfo | null;
  is_shop?: boolean | null;
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

type FormDataResult = {
  accounts: Account[];
  subcategories: Subcategory[];
  people: Person[];
};

const DEFAULT_TRANSFER_CATEGORY: Subcategory = {
  id: "sub-transfer-generic",
  name: "General Transfer",
  image_url: null,
  transaction_nature: "TF",
  is_shop: false,
  categories: [
    {
      name: "Transfers",
      transaction_nature: "TF",
    },
  ],
};

const hasMeaningfulError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }
  if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
    return Boolean((error as { message?: string }).message);
  }
  if ("details" in error && typeof (error as { details?: unknown }).details === "string") {
    return Boolean((error as { details?: string }).details);
  }
  if ("hint" in error && typeof (error as { hint?: unknown }).hint === "string") {
    return Boolean((error as { hint?: string }).hint);
  }
  return Object.keys(error).length > 0;
};

export async function loadTransactionFormData(): Promise<FormDataResult> {
  if (!isSupabaseConfigured || !supabase) {
    const { accounts, subcategories, people } = getMockTransactionFormData();
    const normalizedSubcategories = subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      image_url: subcategory.image_url,
      transaction_nature: normalizeTransactionNature(subcategory.transaction_nature ?? null) ?? null,
      is_shop: subcategory.is_shop ?? false,
      categories: Array.isArray(subcategory.categories)
        ? subcategory.categories.map((category) => ({
            ...category,
            transaction_nature: normalizeTransactionNature(category.transaction_nature ?? null) ?? null,
          }))
        : subcategory.categories
          ? {
              ...subcategory.categories,
              transaction_nature: normalizeTransactionNature(subcategory.categories.transaction_nature ?? null) ?? null,
            }
          : null,
    }));

    const normalizedPeople = people.map((person) => ({
      id: person.id,
      name: person.name,
      image_url: person.image_url,
      is_group: person.is_group,
    }));

    const normalizedAccounts = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      image_url: account.image_url,
      type: account.type,
      is_cashback_eligible: account.is_cashback_eligible,
      cashback_percentage: account.cashback_percentage,
      max_cashback_amount: account.max_cashback_amount,
    }));

    const includesTransfer = normalizedSubcategories.some(
      (subcategory) => normalizeTransactionNature(subcategory.transaction_nature ?? null) === "TF"
    );

    return {
      accounts: normalizedAccounts,
      subcategories: includesTransfer ? normalizedSubcategories : [...normalizedSubcategories, DEFAULT_TRANSFER_CATEGORY],
      people: normalizedPeople,
    };
  }

  const accountsPromise = supabase
    .from("accounts")
    .select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabase
    .from("subcategories")
    .select("id, name, image_url, is_shop, categories(name, transaction_nature)");
  const peoplePromise = supabase.from("people").select("id, name, image_url, is_group");
  const categoriesPromise = supabase.from("categories").select("id, name, transaction_nature, image_url");

  const [
    { data: accounts, error: accountsError },
    { data: subcategories, error: subcategoriesError },
    { data: people, error: peopleError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([accountsPromise, subcategoriesPromise, peoplePromise, categoriesPromise]);

  if (hasMeaningfulError(accountsError)) {
    console.error("Failed to fetch accounts:", accountsError);
  }
  if (hasMeaningfulError(subcategoriesError)) {
    console.error("Failed to fetch subcategories:", subcategoriesError);
  }
  if (hasMeaningfulError(peopleError)) {
    console.error("Failed to fetch people:", peopleError);
  }
  if (hasMeaningfulError(categoriesError)) {
    console.error("Failed to fetch categories:", categoriesError);
  }

  const typedSubcategories = (subcategories as Subcategory[]) || [];
  const typedCategories = (categories as CategoryRecord[] | null) || [];

  const existingIds = new Set(typedSubcategories.map((item) => item.id));
  const missingCategories = typedCategories.filter((category) => !existingIds.has(category.id));

  const synthesizedSubcategories: Subcategory[] = missingCategories.map((category) => {
    const normalizedNature = normalizeTransactionNature(category.transaction_nature ?? null) ?? null;
    return {
      id: category.id,
      name: category.name,
      image_url: category.image_url ?? null,
      transaction_nature: normalizedNature,
      is_shop: false,
      categories: [
        {
          name: category.name,
          transaction_nature: normalizedNature,
        },
      ],
    };
  });

  const combinedSubcategories = [...typedSubcategories, ...synthesizedSubcategories];

  const hasTransferSubcategory = combinedSubcategories.some(
    (subcategory) => normalizeTransactionNature(subcategory.transaction_nature ?? null) === "TF"
  );

  if (!hasTransferSubcategory) {
    combinedSubcategories.push(DEFAULT_TRANSFER_CATEGORY);
  }

  return {
    accounts: (accounts as Account[]) || [],
    subcategories: combinedSubcategories,
    people: (people as Person[]) || [],
  };
}

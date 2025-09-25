import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { createTranslator } from "@/lib/i18n";
import TransactionForm from "./TransactionForm";
import { getMockTransactionFormData } from "@/data/mockData";

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
  if (!isSupabaseConfigured || !supabase) {
    const { accounts, subcategories, people } = getMockTransactionFormData();
    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        image_url: account.image_url,
        type: account.type,
        is_cashback_eligible: account.is_cashback_eligible,
        cashback_percentage: account.cashback_percentage,
        max_cashback_amount: account.max_cashback_amount,
      })),
      subcategories: subcategories.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        image_url: subcategory.image_url,
        transaction_nature: subcategory.transaction_nature,
        categories: subcategory.categories,
      })),
      people: people.map((person) => ({
        id: person.id,
        name: person.name,
        image_url: person.image_url,
        is_group: person.is_group,
      })),
    };
  }

  const accountsPromise = supabase
    .from("accounts")
    .select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabase
    .from("subcategories")
    .select("id, name, image_url, categories(name, transaction_nature)");
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

  const existingIds = new Set(typedSubcategories.map((item) => item.id));
  const missingCategories = typedCategories.filter((category) => !existingIds.has(category.id));

  if (missingCategories.length > 0) {
    const upsertPayload = missingCategories.map((category) => ({
      category_id: category.id,
      name: category.name,
      image_url: category.image_url ?? null,
    }));

    const { error: createMissingError } = await supabase
      .from("subcategories")
      .upsert(upsertPayload, { onConflict: "category_id" });

    if (createMissingError) {
      const detail =
        typeof createMissingError.message === "string" && createMissingError.message.trim().length > 0
          ? createMissingError.message
          : null;
      if (detail) {
        console.error("Failed to ensure subcategories for categories:", detail);
      } else {
        console.warn("Failed to ensure subcategories for categories.");
      }
    } else {
      const { data: refreshedSubcategories, error: refreshError } = await supabase
        .from("subcategories")
        .select("id, name, image_url, categories(name, transaction_nature)");

      if (!refreshError && refreshedSubcategories) {
        return {
          accounts: (accounts as Account[]) || [],
          subcategories: refreshedSubcategories as Subcategory[],
          people: (people as Person[]) || [],
        };
      }

      if (refreshError) {
        console.error("Failed to refresh subcategories:", refreshError);
      }
    }
  }

  return {
    accounts: (accounts as Account[]) || [],
    subcategories: typedSubcategories,
    people: (people as Person[]) || [],
  };
}

const DEFAULT_RETURN_PATH = "/transactions";

const normalizeReturnPath = (value: string | string[] | undefined) => {
  if (!value) return DEFAULT_RETURN_PATH;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return DEFAULT_RETURN_PATH;
  try {
    const decoded = decodeURIComponent(candidate);
    return decoded.startsWith("/") ? decoded : DEFAULT_RETURN_PATH;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
};

const resolveSearchParams = async (
  input?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
) => {
  if (!input) return {} as Record<string, string | string[] | undefined>;
  return input instanceof Promise ? await input : input;
};

type AddTransactionPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function AddTransactionPage({ searchParams }: AddTransactionPageProps) {
  const t = createTranslator();
  const params = await resolveSearchParams(searchParams);
  const { accounts, subcategories, people } = await getFormData();
  const createdSubcategoryId = typeof params.createdSubcategoryId === "string" ? params.createdSubcategoryId : undefined;
  const tabParam = typeof params.tab === "string" ? params.tab.toLowerCase() : undefined;
  const initialTab =
    tabParam === "expense" || tabParam === "income" || tabParam === "transfer" || tabParam === "debt"
      ? (tabParam as "expense" | "income" | "transfer" | "debt")
      : undefined;
  const returnTo = normalizeReturnPath(params.returnTo);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{t("transactionForm.title")}</h1>
      <div className="bg-white rounded-lg shadow-md">
        <TransactionForm
          accounts={accounts}
          subcategories={subcategories}
          people={people}
          returnTo={returnTo}
          createdSubcategoryId={createdSubcategoryId}
          initialTab={initialTab}
        />
      </div>
    </div>
  );
}
import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabaseClient";
import { getMockTransactionFormData } from "@/data/mockData";
import {
  normalizeTransactionNature,
  type TransactionNatureCode,
} from "@/lib/transactionNature";

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
  transaction_nature: TransactionNatureCode | null;
};

type CategoryRelation = {
  name?: string | null;
  transaction_nature?: string | null;
};

const normalizeCategoryRelations = (
  categories?: CategoryRelation | CategoryRelation[] | null
): CategoryInfo[] | CategoryInfo | null => {
  if (!categories) {
    return null;
  }
  const wasArray = Array.isArray(categories);
  const list = wasArray ? categories : [categories];
  const normalized = list
    .map((item) => {
      if (!item) {
        return null;
      }
      const name = typeof item.name === "string" && item.name.trim() ? item.name : "";
      return {
        name,
        transaction_nature: normalizeTransactionNature(item.transaction_nature ?? null),
      } satisfies CategoryInfo;
    })
    .filter((value): value is CategoryInfo => Boolean(value));

  if (normalized.length === 0) {
    return null;
  }
  if (wasArray) {
    return normalized;
  }
  return normalized[0];
};

const mapSubcategoryRecord = (input: {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  is_shop?: boolean | null;
  categories?: CategoryRelation | CategoryRelation[] | null;
}): Subcategory => ({
  id: input.id,
  name: input.name,
  image_url: input.image_url ?? null,
  transaction_nature: normalizeTransactionNature(input.transaction_nature ?? null) ?? null,
  categories: normalizeCategoryRelations(input.categories),
  is_shop: input.is_shop ?? false,
});

export type Subcategory = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: TransactionNatureCode | null;
  categories: CategoryInfo[] | CategoryInfo | null;
  is_shop?: boolean | null;
};

export type Shop = {
  id: string;
  name: string;
  image_url: string | null;
  type?: string | null;
  created_at?: string | null;
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
  shops: Shop[];
  usingMockSubcategories: boolean;
};

const fallbackShops: Shop[] = [
  {
    id: "2a3d882e-f2ba-4f3b-9f24-0c5a5d0051a6",
    name: "Tiki",
    image_url:
      "https://cdn2.fptshop.com.vn/unsafe/Uploads/images/tin-tuc/177245/Originals/tiki-logo-6.jpg",
    type: "ecommerce",
    created_at: "2025-09-26T03:22:27.849Z",
  },
  {
    id: "66fba1f8-3ef1-4058-8fc4-07e1a19e597d",
    name: "VPBank",
    image_url:
      "https://pbs.twimg.com/profile_images/378800000532330354/fd4fca70e3fecce6a5e010f08742d762_400x400.png",
    type: "bank",
    created_at: "2025-09-26T03:22:27.849Z",
  },
];

const DEFAULT_TRANSFER_CATEGORY: Subcategory = {
  id: "a6f07c8d-4ec6-4c2b-8a7e-d2a5f8d5c1f0",
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

const extractMeaningfulError = (error: unknown): string | null => {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.message.trim() ? error.message : null;
  }

  if (typeof error !== "object") {
    return null;
  }

  const { message, details, hint, code } = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };

  const candidates = [message, details, hint, code];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  const serialized = Object.entries(error)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => `${key}: ${(value as string).trim()}`)
    .join(", ");

  return serialized.length > 0 ? serialized : null;
};

export async function loadTransactionFormData(): Promise<FormDataResult> {
  const supabaseClient = supabase;

  if (!isSupabaseConfigured || !supabaseClient) {
    const { accounts, subcategories, people } = getMockTransactionFormData();
    const normalizedSubcategories = subcategories.map((subcategory) =>
      mapSubcategoryRecord({
        id: subcategory.id,
        name: subcategory.name,
        image_url: subcategory.image_url,
        transaction_nature: subcategory.transaction_nature,
        is_shop: subcategory.is_shop ?? false,
        categories: subcategory.categories,
      })
    );

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
      subcategories: includesTransfer
        ? normalizedSubcategories
        : [...normalizedSubcategories, DEFAULT_TRANSFER_CATEGORY],
      people: normalizedPeople,
      shops: fallbackShops,
      usingMockSubcategories: true,
    };
  }

  const accountsPromise = supabaseClient
    .from("accounts")
    .select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabaseClient
    .from("subcategories")
    .select("id, name, image_url, is_shop, transaction_nature, categories(name, transaction_nature)");
  const peoplePromise = supabaseClient.from("people").select("id, name, image_url, is_group");
  const shopsPromise = supabaseClient
    .from("shops")
    .select("id, name, image_url, type, created_at")
    .order("name", { ascending: true });

  const [
    { data: accounts, error: accountsError },
    { data: subcategories, error: subcategoriesError },
    { data: people, error: peopleError },
    { data: shops, error: shopsError },
  ] = await Promise.all([accountsPromise, subcategoriesPromise, peoplePromise, shopsPromise]);

  const accountsErrorMessage = extractMeaningfulError(accountsError);
  if (accountsErrorMessage) {
    console.error("Failed to fetch accounts:", accountsErrorMessage);
  }
  const subcategoriesErrorMessage = extractMeaningfulError(subcategoriesError);
  if (subcategoriesErrorMessage) {
    console.error("Failed to fetch subcategories:", subcategoriesErrorMessage);
  }
  const peopleErrorMessage = extractMeaningfulError(peopleError);
  if (peopleErrorMessage) {
    console.error("Failed to fetch people:", peopleErrorMessage);
  }
  const shopsErrorMessage = extractMeaningfulError(shopsError);
  if (shopsErrorMessage) {
    console.error("Failed to fetch shops:", shopsErrorMessage);
  }

  type RawSubcategory = {
    id: string;
    name: string;
    image_url: string | null;
    transaction_nature?: string | null;
    is_shop?: boolean | null;
    categories?: CategoryRelation | CategoryRelation[] | null;
  };

  let normalizedSubcategories = ((subcategories as RawSubcategory[] | null) || []).map((item) =>
    mapSubcategoryRecord({
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      transaction_nature: item.transaction_nature,
      is_shop: item.is_shop,
      categories: item.categories,
    })
  );

  const usingMockSubcategories = normalizedSubcategories.length === 0;

  if (usingMockSubcategories) {
    normalizedSubcategories = [];
  }

  const typedAccounts = (accounts as Account[] | null) || [];
  const typedPeople = (people as Person[] | null) || [];
  const typedShops = (shops as Shop[] | null) || [];

  return {
    accounts: typedAccounts,
    subcategories: normalizedSubcategories,
    people: typedPeople,
    shops: typedShops.length > 0 ? typedShops : fallbackShops,
    usingMockSubcategories,
  };
}

export async function loadShops(): Promise<{ shops: Shop[]; errorMessage?: string }> {
  const supabaseClient = supabase;

  if (!isSupabaseConfigured || !supabaseClient) {
    return { shops: fallbackShops, errorMessage: supabaseConfigurationError?.message };
  }

  const { data, error } = await supabaseClient
    .from("shops")
    .select("id, name, image_url, type, created_at")
    .order("name", { ascending: true });

  let errorMessage: string | undefined;
  const loadErrorMessage = extractMeaningfulError(error);
  if (loadErrorMessage) {
    errorMessage = error?.message || "Unable to fetch shops.";
    console.error("Failed to fetch shops:", loadErrorMessage);
  }

  const typed = (data as Shop[] | null) || [];

  return { shops: typed.length > 0 ? typed : fallbackShops, errorMessage };
}

import { supabase, isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabaseClient";
import { getMockTransactionFormData } from "@/data/mockData";
import { normalizeTransactionNature } from "@/lib/transactionNature";

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
  transaction_nature: string | null;
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
  transaction_nature?: string | null;
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

const extractMeaningfulErrorMessage = (error: unknown): string | null => {
  if (error == null) {
    return null;
  }
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (error instanceof Error) {
    const message = error.message?.trim();
    if (message) {
      return message;
    }
    return error.name || null;
  }
  if (typeof error !== "object") {
    return String(error);
  }

  const record = error as Record<string, unknown>;
  const candidateKeys = ["message", "details", "hint", "code", "status", "statusText"] as const;
  for (const key of candidateKeys) {
    if (key in record) {
      const value = record[key];
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      } else if (typeof value === "number" && Number.isFinite(value)) {
        return `${key}: ${value}`;
      }
    }
  }

  const summarizedEntries = Object.entries(record)
    .map(([key, value]) => {
      if (value == null) {
        return null;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? `${key}: ${trimmed}` : null;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return `${key}: ${value}`;
      }
      if (typeof value === "boolean") {
        return `${key}: ${value}`;
      }
      return null;
    })
    .filter((entry): entry is string => Boolean(entry));

  if (summarizedEntries.length > 0) {
    return summarizedEntries.join(", ");
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") {
      return serialized;
    }
  } catch {
    // ignore serialization failures
  }

  return null;
};

const logMeaningfulError = (context: string, error: unknown, fallbackMessage?: string) => {
  const message = extractMeaningfulErrorMessage(error) ?? fallbackMessage ?? null;
  if (message) {
    console.error(`${context}: ${message}`);
    return message;
  }
  return null;
};

export async function loadTransactionFormData(): Promise<FormDataResult> {
  if (!isSupabaseConfigured || !supabase) {
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
    };
  }

  const accountsPromise = supabase
    .from("accounts")
    .select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabase
    .from("subcategories")
    .select("id, name, image_url, is_shop, transaction_nature, categories(name, transaction_nature)");
  const peoplePromise = supabase.from("people").select("id, name, image_url, is_group");
  const shopsPromise = supabase
    .from("shops")
    .select("id, name, image_url, type, created_at")
    .order("name", { ascending: true });

  const [
    { data: accounts, error: accountsError },
    { data: subcategories, error: subcategoriesError },
    { data: people, error: peopleError },
    { data: shops, error: shopsError },
  ] = await Promise.all([accountsPromise, subcategoriesPromise, peoplePromise, shopsPromise]);

  logMeaningfulError("Failed to fetch accounts", accountsError);
  logMeaningfulError("Failed to fetch subcategories", subcategoriesError);
  logMeaningfulError("Failed to fetch people", peopleError);
  logMeaningfulError("Failed to fetch shops", shopsError);

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

  if (normalizedSubcategories.length === 0) {
    const fallback = getMockTransactionFormData();
    normalizedSubcategories = fallback.subcategories.map((subcategory) =>
      mapSubcategoryRecord({
        id: subcategory.id,
        name: subcategory.name,
        image_url: subcategory.image_url,
        transaction_nature: subcategory.transaction_nature,
        is_shop: subcategory.is_shop ?? false,
        categories: subcategory.categories,
      })
    );
  }

  const hasTransferSubcategory = normalizedSubcategories.some(
    (subcategory) => normalizeTransactionNature(subcategory.transaction_nature ?? null) === "TF"
  );

  if (!hasTransferSubcategory) {
    normalizedSubcategories.push(DEFAULT_TRANSFER_CATEGORY);
  }

  const typedAccounts = (accounts as Account[] | null) || [];
  const typedPeople = (people as Person[] | null) || [];
  const typedShops = (shops as Shop[] | null) || [];

  return {
    accounts: typedAccounts,
    subcategories: normalizedSubcategories,
    people: typedPeople,
    shops: typedShops.length > 0 ? typedShops : fallbackShops,
  };
}

export async function loadShops(): Promise<{ shops: Shop[]; errorMessage?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { shops: fallbackShops, errorMessage: supabaseConfigurationError?.message };
  }

  const { data, error } = await supabase
    .from("shops")
    .select("id, name, image_url, type, created_at")
    .order("name", { ascending: true });

  let errorMessage: string | undefined;
  if (error) {
    errorMessage = logMeaningfulError("Failed to fetch shops", error, "Unable to fetch shops.") ?? undefined;
  }

  const typed = (data as Shop[] | null) || [];

  return { shops: typed.length > 0 ? typed : fallbackShops, errorMessage };
}

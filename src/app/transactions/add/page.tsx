import TransactionForm from "./TransactionForm";
import { loadTransactionFormData } from "./formData";

export { type Account, type Category, type Person } from "./formData";

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
  const params = await resolveSearchParams(searchParams);
  const { accounts, categories, people, shops, usingMockCategories } = await loadTransactionFormData();
  const createdCategoryId = typeof params.createdCategoryId === "string" ? params.createdCategoryId : undefined;
  const tabParam = typeof params.tab === "string" ? params.tab.toLowerCase() : undefined;
  const initialTab =
    tabParam === "expense" || tabParam === "income" || tabParam === "transfer" || tabParam === "debt"
      ? (tabParam as "expense" | "income" | "transfer" | "debt")
      : undefined;
  const returnTo = normalizeReturnPath(params.returnTo);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <TransactionForm
          accounts={accounts}
          categories={categories}
          people={people}
          shops={shops}
          usingMockCategories={usingMockCategories}
          returnTo={returnTo}
          createdCategoryId={createdCategoryId}
          initialTab={initialTab}
          layout="modal"
        />
      </div>
    </div>
  );
}
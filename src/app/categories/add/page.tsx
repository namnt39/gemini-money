import CategoryForm from "@/components/categories/CategoryForm";
import { createTranslator } from "@/lib/i18n";

const DEFAULT_RETURN_PATH = "/categories";

const normalizeReturnPath = (value: string | string[] | undefined) => {
  if (!value) return DEFAULT_RETURN_PATH;
  if (Array.isArray(value)) {
    return value[0] || DEFAULT_RETURN_PATH;
  }
  try {
    const decoded = decodeURIComponent(value);
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

type AddCategoryPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function AddCategoryPage({ searchParams }: AddCategoryPageProps) {
  const params = await resolveSearchParams(searchParams);
  const returnTo = normalizeReturnPath(params.returnTo);
  const defaultNature = typeof params.defaultNature === "string" ? params.defaultNature : undefined;
  const t = createTranslator();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-800">{t("categoryForm.title")}</h1>
      <div className="rounded-lg bg-white p-6 shadow-md">
        <CategoryForm returnTo={returnTo} defaultNature={defaultNature} />
      </div>
    </div>
  );
}

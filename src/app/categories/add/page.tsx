import Link from "next/link";

import CategoryForm from "@/components/categories/CategoryForm";
import { ClearIcon } from "@/components/Icons";
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
    <div className="fixed inset-0 z-50 flex min-h-screen w-full items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-800">{t("categoryForm.title")}</h1>
          <Link
            href={returnTo}
            aria-label={t("categoryForm.back")}
            className="inline-flex items-center justify-center rounded-full border border-transparent p-2 text-gray-500 transition hover:border-gray-200 hover:bg-gray-100 hover:text-gray-700"
          >
            <ClearIcon />
          </Link>
        </div>
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto px-6 py-6">
          <CategoryForm returnTo={returnTo} defaultNature={defaultNature} />
        </div>
      </div>
    </div>
  );
}

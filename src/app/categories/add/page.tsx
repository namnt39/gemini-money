import CategoryForm from "@/components/categories/CategoryForm";

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

type AddCategoryPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function AddCategoryPage({ searchParams }: AddCategoryPageProps) {
  const params = searchParams ?? {};
  const returnTo = normalizeReturnPath(params.returnTo);
  const defaultNature = typeof params.defaultNature === "string" ? params.defaultNature : undefined;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Thêm danh mục mới</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <CategoryForm returnTo={returnTo} defaultNature={defaultNature} />
      </div>
    </div>
  );
}

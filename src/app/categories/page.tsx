import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";

type CategoryRecord = {
  id: string;
  name: string;
  image_url: string | null;
  transaction_nature?: string | null;
  categories?: { transaction_nature?: string | null } | null;
};

const natureLabels: Record<string, string> = {
  EX: "Chi tiêu",
  IN: "Thu nhập",
  TR: "Chuyển khoản",
  DE: "Công nợ",
};

const getNatureLabel = (value?: string | null) => {
  if (!value) return "Không xác định";
  return natureLabels[value] ?? value;
};

async function getCategories() {
  const { data, error } = await supabase
    .from("subcategories")
    .select("id, name, image_url, transaction_nature, categories(transaction_nature)")
    .order("name", { ascending: true });

  if (error) {
    console.error("Không thể lấy danh mục:", error);
    return [] as CategoryRecord[];
  }

  return (data as CategoryRecord[]) || [];
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Danh mục</h1>
        <Link
          href="/categories/add"
          className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          + Thêm mới
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Biểu tượng</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Tên danh mục</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Loại giao dịch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => {
                const nature = category.transaction_nature ?? category.categories?.transaction_nature ?? undefined;
                return (
                  <tr key={category.id}>
                    <td className="px-4 py-3">
                      {category.image_url ? (
                        <Image
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
                    <td className="px-4 py-3 text-gray-600">{getNatureLabel(nature)}</td>
                  </tr>
                );
              })}
              {categories.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                    Chưa có danh mục nào.
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

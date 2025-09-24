"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createCategory, TransactionNature } from "@/app/categories/actions";

const natureOptions: { value: TransactionNature; label: string }[] = [
  { value: "EX", label: "Chi tiêu" },
  { value: "IN", label: "Thu nhập" },
  { value: "TR", label: "Chuyển khoản" },
  { value: "DE", label: "Công nợ" },
];

type CategoryFormProps = {
  returnTo: string;
  defaultNature?: string;
};

const getInitialNature = (defaultNature?: string): TransactionNature => {
  const normalized = (defaultNature || "").toUpperCase();
  return natureOptions.find((option) => option.value === normalized)?.value ?? "EX";
};

export default function CategoryForm({ returnTo, defaultNature }: CategoryFormProps) {
  const router = useRouter();
  const initialNature = useMemo(() => getInitialNature(defaultNature), [defaultNature]);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [transactionNature, setTransactionNature] = useState<TransactionNature>(initialNature);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    return name.trim() !== "" || imageUrl.trim() !== "" || transactionNature !== initialNature;
  }, [name, imageUrl, transactionNature, initialNature]);

  const handleBack = () => {
    if (isDirty) {
      const shouldLeave = confirm("Bạn có chắc muốn quay lại? Thông tin chưa được lưu sẽ bị mất.");
      if (!shouldLeave) {
        return;
      }
    }
    router.push(returnTo);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await createCategory({
      name,
      transactionNature,
      imageUrl,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    alert(result.message);
    router.push(returnTo);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="category-name">
          Tên danh mục
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-base"
          placeholder="Ví dụ: Ăn uống"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="category-nature">
          Loại giao dịch
        </label>
        <select
          id="category-nature"
          value={transactionNature}
          onChange={(event) => setTransactionNature(event.target.value as TransactionNature)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-base"
        >
          {natureOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700" htmlFor="category-image">
          Hình ảnh (URL)
        </label>
        <input
          id="category-image"
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 text-base"
          placeholder="https://example.com/image.png"
        />
        <p className="text-xs text-gray-500">Nhập đường dẫn ảnh biểu tượng cho danh mục (nếu có).</p>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Quay lại
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-base font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu..." : "Lưu danh mục"}
        </button>
      </div>
    </form>
  );
}

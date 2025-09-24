"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export type TransactionNature = "EX" | "IN" | "TR" | "DE";

type CreateCategoryInput = {
  name: string;
  transactionNature: TransactionNature;
  imageUrl?: string | null;
};

type ActionResult = {
  success: boolean;
  message: string;
  categoryId?: string;
};

const VALID_NATURES: TransactionNature[] = ["EX", "IN", "TR", "DE"];

const normalizeImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function createCategory(input: CreateCategoryInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, message: "Vui lòng nhập tên danh mục." };
  }

  const transactionNature = VALID_NATURES.includes(input.transactionNature)
    ? input.transactionNature
    : "EX";

  const payload = {
    name,
    transaction_nature: transactionNature,
    image_url: normalizeImageUrl(input.imageUrl),
  };

  const { data, error } = await supabase
    .from("subcategories")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("Không thể tạo danh mục:", error);
    return { success: false, message: "Không thể tạo danh mục mới." };
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/transactions/add");
  revalidatePath("/");

  return {
    success: true,
    message: "Tạo danh mục thành công!",
    categoryId: data?.id,
  };
}

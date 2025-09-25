"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

export type TransactionNature = "EX" | "IN" | "TR" | "DE";

type CreateCategoryInput = {
  name: string;
  transactionNature: string;
  imageUrl?: string | null;
};

type ActionResult = {
  success: boolean;
  message: string;
  categoryId?: string;
  subcategoryId?: string;
};

const normalizeImageUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function createCategory(input: CreateCategoryInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, message: "Please provide a category name." };
  }

  const rawNature = (input.transactionNature || "").toString().trim().toUpperCase();
  const natureAliasMap: Record<string, TransactionNature> = {
    EX: "EX",
    EXPENSE: "EX",
    EXPENSES: "EX",
    IN: "IN",
    INCOME: "IN",
    INCOMES: "IN",
    TR: "TR",
    TRANSFER: "TR",
    TRANSFERS: "TR",
    DE: "DE",
    DEBT: "DE",
  };
  const transactionNature = natureAliasMap[rawNature] ?? "EX";

  const payload = {
    name,
    transaction_nature: transactionNature,
    image_url: normalizeImageUrl(input.imageUrl),
  };

  const { data: createdCategory, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("id, image_url")
    .single();

  if (error) {
    console.error("Unable to create category:", error);
    const detail = error?.message ? `: ${error.message}` : "";
    return { success: false, message: `Unable to create a new category${detail}.` };
  }

  const categoryId = createdCategory?.id;
  if (!categoryId) {
    return { success: false, message: "Unable to create a new category." };
  }

  const subcategoryPayload = {
    category_id: categoryId,
    name,
    image_url: createdCategory?.image_url ?? null,
  };

  const { data: createdSubcategory, error: subcategoryError } = await supabase
    .from("subcategories")
    .insert(subcategoryPayload)
    .select("id")
    .single();

  if (subcategoryError) {
    console.error("Unable to create subcategory for category:", subcategoryError);
    await supabase.from("categories").delete().eq("id", categoryId);
    const detail = subcategoryError?.message ? `: ${subcategoryError.message}` : "";
    return { success: false, message: `Unable to create a new category${detail}.` };
  }

  const subcategoryId = createdSubcategory?.id;

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/transactions/add");
  revalidatePath("/");

  return {
    success: true,
    message: "Category created successfully!",
    categoryId,
    subcategoryId,
  };
}

"use server";

import { requireSupabaseClient, supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";
import {
  getDatabaseNatureCandidates,
  normalizeTransactionNature,
  type TransactionNatureCode,
} from "@/lib/transactionNature";

export type TransactionNature = TransactionNatureCode;

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
  const supabaseClient = supabase ?? requireSupabaseClient();
  const name = input.name.trim();
  if (!name) {
    return { success: false, message: "Please provide a category name." };
  }

  const transactionNature = normalizeTransactionNature(input.transactionNature) ?? "EX";
  const imageUrl = normalizeImageUrl(input.imageUrl);

  const candidates = getDatabaseNatureCandidates(transactionNature);
  const fallbackCandidates =
    transactionNature === "DE" ? getDatabaseNatureCandidates("EX") : [];
  const attemptedCandidates = Array.from(new Set([...candidates, ...fallbackCandidates]));
  let createdCategory: { id: string; image_url: string | null; transaction_nature?: string | null } | null = null;
  let lastError: { message?: string } | null = null;

  for (const candidate of attemptedCandidates) {
    const attempt = await supabaseClient
      .from("categories")
      .insert({
        name,
        transaction_nature: candidate,
        image_url: imageUrl,
      })
      .select("id, image_url, transaction_nature")
      .single();

    if (!attempt.error && attempt.data) {
      createdCategory = attempt.data;
      break;
    }

    lastError = attempt.error;
  }

  if (!createdCategory) {
    if (lastError) {
      console.error("Unable to create category:", lastError);
    }
    const detail = lastError?.message ? `: ${lastError.message}` : "";
    return { success: false, message: `Unable to create a new category${detail}.` };
  }

  const categoryId = createdCategory.id;
  if (!categoryId) {
    return { success: false, message: "Unable to create a new category." };
  }

  const subcategoryPayload = {
    category_id: categoryId,
    name,
    image_url: createdCategory?.image_url ?? null,
    transaction_nature:
      transactionNature === "DE"
        ? transactionNature
        : createdCategory?.transaction_nature ?? transactionNature,
  };

  const { data: createdSubcategory, error: subcategoryError } = await supabaseClient
    .from("subcategories")
    .insert(subcategoryPayload)
    .select("id")
    .single();

  if (subcategoryError) {
    console.error("Unable to create subcategory for category:", subcategoryError);
    await supabaseClient.from("categories").delete().eq("id", categoryId);
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

type DeleteCategoryInput = {
  categoryId: string;
  subcategoryId?: string | null;
};

export async function deleteCategory(input: DeleteCategoryInput): Promise<ActionResult> {
  const supabaseClient = supabase ?? requireSupabaseClient();
  const categoryId = input.categoryId?.trim();
  if (!categoryId) {
    return { success: false, message: "Invalid category identifier." };
  }

  const subcategoryId = input.subcategoryId?.trim() || null;

  const { error: subcategoryError } = subcategoryId
    ? await supabaseClient.from("subcategories").delete().eq("id", subcategoryId)
    : { error: null };

  if (subcategoryError) {
    console.error("Unable to delete subcategory:", subcategoryError);
    const detail = subcategoryError.message ? `: ${subcategoryError.message}` : "";
    return { success: false, message: `Unable to delete category${detail}.` };
  }

  let shouldDeleteCategory = !subcategoryId;

  if (subcategoryId) {
    const { count, error: remainingError } = await supabaseClient
      .from("subcategories")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (remainingError) {
      console.error("Unable to verify remaining subcategories:", remainingError);
      const detail = remainingError.message ? `: ${remainingError.message}` : "";
      return { success: false, message: `Unable to delete category${detail}.` };
    }

    shouldDeleteCategory = (count ?? 0) === 0;
  }

  if (shouldDeleteCategory) {
    const { error: cleanupError } = await supabaseClient
      .from("subcategories")
      .delete()
      .eq("category_id", categoryId);
    if (cleanupError) {
      console.warn("Unable to clean up subcategories for category:", cleanupError);
    }

    const { error: categoryError } = await supabaseClient
      .from("categories")
      .delete()
      .eq("id", categoryId);
    if (categoryError) {
      console.error("Unable to delete category:", categoryError);
      const detail = categoryError.message ? `: ${categoryError.message}` : "";
      return { success: false, message: `Unable to delete category${detail}.` };
    }
  }

  revalidatePath("/categories");
  revalidatePath("/transactions");
  revalidatePath("/transactions/add");
  revalidatePath("/");

  return {
    success: true,
    message: "Category deleted successfully.",
    categoryId,
    subcategoryId: subcategoryId ?? undefined,
  };
}

export async function deleteCategoriesBulk(inputs: DeleteCategoryInput[]): Promise<ActionResult> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { success: false, message: "No categories selected." };
  }

  for (const input of inputs) {
    const result = await deleteCategory(input);
    if (!result.success) {
      return { success: false, message: result.message ?? "Unable to delete selected categories." };
    }
  }

  return { success: true, message: "Categories deleted successfully." };
}

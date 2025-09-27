"use server";

import { requireSupabaseClient } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const revalidateTransactionViews = () => {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/transactions/add");
};

const SUPABASE_UNAVAILABLE_MESSAGE =
  "The database connection is not configured. Please contact support.";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseResolution =
  | { supabaseClient: ReturnType<typeof requireSupabaseClient>; errorMessage?: undefined }
  | { supabaseClient: null; errorMessage: string };

function resolveSupabaseClient(): SupabaseResolution {
  try {
    return { supabaseClient: requireSupabaseClient() };
  } catch (error) {
    console.error("Supabase client is not configured:", error);
    return { supabaseClient: null, errorMessage: SUPABASE_UNAVAILABLE_MESSAGE };
  }
}

type CashbackData = {
  percent: number; // 0-100
  amount: number; // >= 0
  source?: "percent" | "amount" | null;
};

type TransactionData = {
  activeTab: "expense" | "income" | "transfer" | "debt";
  amount: number;
  notes: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  personId?: string | null;
  date: string;
  cashback: CashbackData | null; // include cashback information
  debtMode?: "collect" | "lend";
  shopId?: string | null;
  debtTag?: string | null;
  debtCycleTag?: string | null;
};

type UpdateTransactionInput = TransactionData & { id: string };

async function persistTransaction(data: TransactionData, options: { id?: string } = {}) {
  const { supabaseClient, errorMessage } = resolveSupabaseClient();
  if (!supabaseClient) {
    return { success: false, message: errorMessage ?? SUPABASE_UNAVAILABLE_MESSAGE };
  }

  if (!data.amount || data.amount <= 0) {
    return { success: false, message: "Invalid amount." };
  }
  if (!data.date) {
    return { success: false, message: "Invalid transaction date." };
  }

  const normalizedFromAccountId = data.fromAccountId?.trim() || null;
  const normalizedToAccountId = data.toAccountId?.trim() || null;
  const normalizedCategoryId = data.categoryId?.trim() || null;
  const normalizedPersonId = data.personId?.trim() || null;
  const normalizedShopId = data.shopId?.trim() || null;
  const normalizedNotes = data.notes?.trim() ? data.notes.trim() : null;

  if (normalizedCategoryId && !UUID_REGEX.test(normalizedCategoryId)) {
    return { success: false, message: "Please select a valid category before saving." };
  }

  let cashbackPercent: number | null = null;
  let cashbackAmount: number | null = null;

  if (data.cashback) {
    const { percent, amount, source } = data.cashback;
    const inputSource = source === "percent" || source === "amount" ? source : null;

    const pct = Number(percent);
    const amt = Number(amount);

    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return { success: false, message: "Cashback percentage must be between 0 and 100." };
    }
    if (Number.isNaN(amt) || amt < 0) {
      return { success: false, message: "Cashback amount must be greater than or equal to 0." };
    }
    if (amt > data.amount) {
      return { success: false, message: "Cashback cannot exceed the transaction amount." };
    }

    const basePercent = clampNumber(pct, 0, 100);
    const baseAmount = Math.max(0, Math.min(amt, data.amount));

    let normalizedPercent = basePercent;
    let normalizedAmount = baseAmount;
    let allowedAmountForRounding = data.amount;

    if (data.activeTab === "expense" && normalizedFromAccountId) {
      const { data: accountInfo } = await supabaseClient
        .from("accounts")
        .select("cashback_percentage, max_cashback_amount")
        .eq("id", normalizedFromAccountId)
        .maybeSingle();

      if (accountInfo) {
        const percentLimitFromAccount =
          accountInfo.cashback_percentage != null ? Math.max(0, accountInfo.cashback_percentage * 100) : null;

        const amountLimitFromPercent =
          percentLimitFromAccount != null ? (percentLimitFromAccount / 100) * data.amount : data.amount;
        const amountLimitFromMax =
          accountInfo.max_cashback_amount != null ? accountInfo.max_cashback_amount : data.amount;

        const allowedAmount = Math.max(
          0,
          Math.min(
            Number.isFinite(amountLimitFromPercent) ? amountLimitFromPercent : data.amount,
            Number.isFinite(amountLimitFromMax) ? amountLimitFromMax : data.amount,
            data.amount
          )
        );

        allowedAmountForRounding = allowedAmount;

        const inputAmountFromPercent = (basePercent / 100) * data.amount;
        const candidateAmount = Math.min(baseAmount, inputAmountFromPercent, data.amount);
        const constrainedAmount = Math.max(0, Math.min(candidateAmount, allowedAmount));

        const rawPercentFromAmount = data.amount > 0 ? (constrainedAmount / data.amount) * 100 : 0;
        const percentLimitFromAmount = data.amount > 0 ? (allowedAmount / data.amount) * 100 : 0;
        const effectivePercentLimit =
          percentLimitFromAccount != null
            ? Math.min(percentLimitFromAccount, percentLimitFromAmount, 100)
            : Math.min(percentLimitFromAmount, 100);

        normalizedPercent = clampNumber(rawPercentFromAmount, 0, effectivePercentLimit);
        const amountFromPercentLimit = (normalizedPercent / 100) * data.amount;
        normalizedAmount = Math.max(0, Math.min(constrainedAmount, amountFromPercentLimit, allowedAmount));
      } else {
        normalizedPercent = basePercent;
        normalizedAmount = baseAmount;
      }
    }

    normalizedAmount = Math.max(0, Math.min(Math.round(normalizedAmount), data.amount, Math.round(allowedAmountForRounding)));
    normalizedPercent = data.amount > 0 ? Math.max(0, Number(((normalizedAmount / data.amount) * 100).toFixed(2))) : 0;

    cashbackPercent = inputSource === "percent" ? normalizedPercent : null;
    cashbackAmount = normalizedAmount;
  }

  const finalPrice = Math.max(0, data.amount - (cashbackAmount ?? 0));

  const transactionToPersist: Record<string, unknown> = {
    date: data.date,
    amount: data.amount,
    notes: normalizedNotes,
    status: "Active",
    cashback_percent: cashbackPercent,
    cashback_amount: cashbackAmount,
    final_price: finalPrice,
    from_account_id: null,
    to_account_id: null,
    category_id: null,
    person_id: normalizedPersonId,
    shop_id: normalizedShopId,
    debt_tag: null,
    debt_cycle_tag: null,
  };

  if (data.activeTab === "expense") {
    if (!normalizedFromAccountId || !normalizedCategoryId) {
      return { success: false, message: "Please choose an account and category." };
    }
    transactionToPersist.from_account_id = normalizedFromAccountId;
    transactionToPersist.category_id = normalizedCategoryId;
  } else if (data.activeTab === "income") {
    if (!normalizedToAccountId || !normalizedCategoryId) {
      return { success: false, message: "Please choose an account and category." };
    }
    transactionToPersist.to_account_id = normalizedToAccountId;
    transactionToPersist.category_id = normalizedCategoryId;
  } else if (data.activeTab === "transfer") {
    if (!normalizedFromAccountId || !normalizedToAccountId || !normalizedCategoryId) {
      return { success: false, message: "Please choose both accounts and a category." };
    }
    if (normalizedFromAccountId === normalizedToAccountId) {
      return { success: false, message: "Transfers require different accounts." };
    }
    transactionToPersist.from_account_id = normalizedFromAccountId;
    transactionToPersist.to_account_id = normalizedToAccountId;
    transactionToPersist.category_id = normalizedCategoryId;
  } else if (data.activeTab === "debt") {
    if (!normalizedPersonId) {
      return { success: false, message: "Please choose a person and account." };
    }

    const debtMode = data.debtMode === "collect" ? "collect" : "lend";

    if (debtMode === "collect") {
      if (!normalizedToAccountId) {
        return { success: false, message: "Please choose a destination account." };
      }
      transactionToPersist.to_account_id = normalizedToAccountId;
      transactionToPersist.debt_cycle_tag = data.debtCycleTag?.trim() || null;
    } else {
      if (!normalizedFromAccountId) {
        return { success: false, message: "Please choose a source account." };
      }
      transactionToPersist.from_account_id = normalizedFromAccountId;
      transactionToPersist.debt_tag = data.debtTag?.trim() || null;
    }

    if (normalizedCategoryId) {
      transactionToPersist.category_id = normalizedCategoryId;
    }
  } else {
    return { success: false, message: "Unsupported transaction type." };
  }

  const query = supabaseClient.from("transactions");
  let error: { message?: string } | null = null;
  if (options.id) {
    ({ error } = await query.update(transactionToPersist).eq("id", options.id));
  } else {
    ({ error } = await query.insert(transactionToPersist));
  }

  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  revalidateTransactionViews();

  return {
    success: true,
    message: options.id ? "Transaction updated successfully." : "Transaction created successfully!",
  };
}

export async function createTransaction(data: TransactionData) {
  return persistTransaction(data);
}

export async function updateTransaction(input: UpdateTransactionInput) {
  const id = input.id?.trim();
  if (!id) {
    return { success: false, message: "Missing transaction identifier." };
  }
  const { id: _, ...rest } = input;
  void _;
  return persistTransaction(rest, { id });
}

export async function deleteTransaction(transactionId: string) {
  if (!transactionId) {
    return { success: false, message: "Missing transaction identifier." };
  }

  const { supabaseClient, errorMessage } = resolveSupabaseClient();
  if (!supabaseClient) {
    return { success: false, message: errorMessage ?? SUPABASE_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabaseClient
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("Unable to delete transaction:", error);
    return { success: false, message: "Failed to delete transaction." };
  }

  revalidateTransactionViews();

  return { success: true, message: "Transaction deleted." };
}

export async function deleteTransactions(transactionIds: string[]) {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return { success: false, message: "No transactions selected." };
  }

  const { supabaseClient, errorMessage } = resolveSupabaseClient();
  if (!supabaseClient) {
    return { success: false, message: errorMessage ?? SUPABASE_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabaseClient
    .from("transactions")
    .delete()
    .in("id", transactionIds);

  if (error) {
    console.error("Unable to delete transactions:", error);
    return { success: false, message: "Failed to delete selected transactions." };
  }

  revalidateTransactionViews();

  return { success: true, message: "Transactions deleted." };
}

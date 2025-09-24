"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type CashbackData = {
  percent: number; // 0-100
  amount: number;  // >= 0
};

type TransactionData = {
  activeTab: "expense" | "income" | "transfer" | "debt";
  amount: number;
  notes: string | null;
  fromAccountId: string;
  toAccountId: string;
  subcategoryId: string;
  personId: string;
  date: string;
  cashback: CashbackData | null; // include cashback information
};

export async function createTransaction(data: TransactionData) {
  // Basic validation rules
  if (!data.amount || data.amount <= 0) {
    return { success: false, message: "Invalid amount." };
  }
  if (!data.date) {
    return { success: false, message: "Invalid transaction date." };
  }

  // Validate cashback input if provided
  let cashbackPercent: number | null = null;
  let cashbackAmount: number | null = null;

  if (data.cashback) {
    const { percent, amount } = data.cashback;

    // Coerce NaN -> invalid
    const pct = Number(percent);
    const amt = Number(amount);

    if (isNaN(pct) || pct < 0 || pct > 100) {
      return { success: false, message: "Cashback percentage must be between 0 and 100." };
    }
    if (isNaN(amt) || amt < 0) {
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

    if (data.activeTab === "expense" && data.fromAccountId) {
      const { data: accountInfo } = await supabase
        .from("accounts")
        .select("cashback_percentage, max_cashback_amount")
        .eq("id", data.fromAccountId)
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

    normalizedAmount = Math.max(
      0,
      Math.min(Math.round(normalizedAmount), data.amount, Math.round(allowedAmountForRounding))
    );
    normalizedPercent =
      data.amount > 0 ? Math.max(0, Number(((normalizedAmount / data.amount) * 100).toFixed(2))) : 0;

    cashbackPercent = normalizedPercent;
    cashbackAmount = normalizedAmount;
  }

  // Calculate final price: amount minus cashback (never negative)
  const finalPrice = Math.max(0, data.amount - (cashbackAmount ?? 0));

  // Prepare payload for insertion
  const transactionToInsert: Record<string, unknown> = {
    date: data.date,
    amount: data.amount,
    notes: data.notes,
    status: "Active",
    // Cashback fields
    cashback_percent: cashbackPercent,
    cashback_amount: cashbackAmount,
    // Final amount after cashback
    final_price: finalPrice,
  };

  // Tab-specific handling
  if (data.activeTab === "expense") {
    if (!data.fromAccountId || !data.subcategoryId) {
      return { success: false, message: "Please choose an account and category." };
    }
    transactionToInsert.from_account_id = data.fromAccountId;
    transactionToInsert.subcategory_id = data.subcategoryId;
  } else if (data.activeTab === "income") {
    if (!data.toAccountId || !data.subcategoryId) {
      return { success: false, message: "Please choose an account and category." };
    }
    transactionToInsert.to_account_id = data.toAccountId;
    transactionToInsert.subcategory_id = data.subcategoryId;
  } else if (data.activeTab === "debt") {
    if (!data.fromAccountId || !data.personId) {
      return { success: false, message: "Please choose a person and account." };
    }
    transactionToInsert.from_account_id = data.fromAccountId;
    transactionToInsert.person_id = data.personId;
  } else {
    // Transfers are not supported yet; keep the current behaviour
    return { success: false, message: "Transfers are not supported yet." };
  }

  // Insert transaction
  const { error } = await supabase.from("transactions").insert(transactionToInsert);
  if (error) {
    return { success: false, message: `Database error: ${error.message}` };
  }

  // Revalidate affected pages
  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true, message: "Transaction added successfully!" };
}

export async function deleteTransaction(transactionId: string) {
  if (!transactionId) {
    return { success: false, message: "Missing transaction identifier." };
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("Unable to delete transaction:", error);
    return { success: false, message: "Failed to delete transaction." };
  }

  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true, message: "Transaction deleted." };
}

export async function deleteTransactions(transactionIds: string[]) {
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return { success: false, message: "No transactions selected." };
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", transactionIds);

  if (error) {
    console.error("Unable to delete transactions:", error);
    return { success: false, message: "Failed to delete selected transactions." };
  }

  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true, message: "Transactions deleted." };
}

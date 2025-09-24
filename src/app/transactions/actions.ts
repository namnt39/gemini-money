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
  cashback: CashbackData | null; // ✅ thêm info cashback
};

export async function createTransaction(data: TransactionData) {
  // --- validation cơ bản giữ nguyên & bổ sung ---
  if (!data.amount || data.amount <= 0) {
    return { success: false, message: "Số tiền không hợp lệ." };
  }
  if (!data.date) {
    return { success: false, message: "Ngày giao dịch không hợp lệ." };
  }

  // Validate cashback (nếu có)
  let cashbackPercent: number | null = null;
  let cashbackAmount: number | null = null;

  if (data.cashback) {
    const { percent, amount } = data.cashback;

    // Coerce NaN -> invalid
    const pct = Number(percent);
    const amt = Number(amount);

    if (isNaN(pct) || pct < 0 || pct > 100) {
      return { success: false, message: "Cashback % không hợp lệ (0–100)." };
    }
    if (isNaN(amt) || amt < 0) {
      return { success: false, message: "Số tiền cashback không hợp lệ (>= 0)." };
    }
    if (amt > data.amount) {
      return { success: false, message: "Cashback không thể lớn hơn số tiền giao dịch." };
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

  // Tính final price: amount - cashback_amount (không âm)
  const finalPrice = Math.max(0, data.amount - (cashbackAmount ?? 0));

  // --- build payload insert ---
  const transactionToInsert: Record<string, unknown> = {
    date: data.date,
    amount: data.amount,
    notes: data.notes,
    status: "Active",
    // ✅ trường cashback
    cashback_percent: cashbackPercent,
    cashback_amount: cashbackAmount,
    // ✅ final_price sau khi trừ cashback
    final_price: finalPrice,
  };

  // --- logic theo tab (giữ nguyên ý tưởng cũ) ---
  if (data.activeTab === "expense") {
    if (!data.fromAccountId || !data.subcategoryId) {
      return { success: false, message: "Vui lòng chọn tài khoản và danh mục." };
    }
    transactionToInsert.from_account_id = data.fromAccountId;
    transactionToInsert.subcategory_id = data.subcategoryId;
  } else if (data.activeTab === "income") {
    if (!data.toAccountId || !data.subcategoryId) {
      return { success: false, message: "Vui lòng chọn tài khoản và danh mục." };
    }
    transactionToInsert.to_account_id = data.toAccountId;
    transactionToInsert.subcategory_id = data.subcategoryId;
  } else if (data.activeTab === "debt") {
    if (!data.fromAccountId || !data.personId) {
      return { success: false, message: "Vui lòng chọn người và tài khoản." };
    }
    transactionToInsert.from_account_id = data.fromAccountId;
    transactionToInsert.person_id = data.personId;
  } else {
    // transfer: vẫn chưa hỗ trợ, giữ nguyên hành vi
    return { success: false, message: "Chức năng Chuyển khoản chưa được hỗ trợ." };
  }

  // --- insert ---
  const { error } = await supabase.from("transactions").insert(transactionToInsert);
  if (error) {
    return { success: false, message: `Lỗi từ database: ${error.message}` };
  }

  // --- revalidate ---
  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true, message: "Thêm giao dịch thành công!" };
}

export async function deleteTransaction(transactionId: string) {
  if (!transactionId) {
    return { success: false, message: "Thiếu mã giao dịch để xóa." };
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) {
    console.error("Không thể xóa giao dịch:", error);
    return { success: false, message: "Xóa giao dịch thất bại." };
  }

  revalidatePath("/");
  revalidatePath("/transactions");

  return { success: true, message: "Đã xóa giao dịch." };
}

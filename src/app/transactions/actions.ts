"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";

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

    cashbackPercent = pct;
    cashbackAmount = amt;
  }

  // Tính final price: amount - cashback_amount (không âm)
  const finalPrice = Math.max(0, data.amount - (cashbackAmount ?? 0));

  // --- build payload insert ---
  const transactionToInsert: any = {
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

"use client";

import { useState, useEffect } from "react";
import { Account } from "@/app/transactions/add/page";
import AmountInput from "./AmountInput"; // Tái sử dụng AmountInput xịn sò của chúng ta

type CashbackInputProps = {
  transactionAmount: string; // Số tiền của giao dịch chính
  account: Account; // Thông tin tài khoản được chọn
  onCashbackChange: (value: { percent: number; amount: number }) => void;
};

export default function CashbackInput({ transactionAmount, account, onCashbackChange }: CashbackInputProps) {
  const [percent, setPercent] = useState<string>('');
  const [fixedAmount, setFixedAmount] = useState<string>('');

  // useEffect là trái tim của logic này, nó sẽ tự động tính toán lại
  // mỗi khi số tiền giao dịch hoặc tài khoản thay đổi.
  useEffect(() => {
    const numericAmount = parseFloat(transactionAmount.replace(/,/g, '')) || 0;
    if (!account.is_cashback_eligible || numericAmount === 0) {
      setPercent('');
      setFixedAmount('');
      return;
    }

    const { cashback_percentage, max_cashback_amount } = account;
    const calculatedCashback = numericAmount * (cashback_percentage || 0);

    // Nếu cashback tính ra vượt quá mức tối đa, lấy mức tối đa
    const finalCashback = Math.min(calculatedCashback, max_cashback_amount || Infinity);
    
    // Tự động điền vào các ô
    setPercent((cashback_percentage! * 100).toString());
    setFixedAmount(finalCashback.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

  }, [transactionAmount, account]);


  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
      <p className="text-sm font-medium text-blue-800">Thông tin Cashback</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Cashback (%)</label>
          <input
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            max={100} // Giới hạn max
            min={0} // Không cho số âm
            placeholder={`${(account.cashback_percentage || 0) * 100}%`}
            className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500 text-lg"
          />
        </div>
        {/* Tái sử dụng AmountInput cho ô nhập số tiền cashback */}
        <div className="-mt-6">
          <AmountInput value={fixedAmount} onChange={setFixedAmount} />
        </div>
      </div>
      <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md">
        Gợi ý: Thẻ {account.name} cashback tối đa {account.max_cashback_amount?.toLocaleString('vi-VN')}đ.
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Account } from "@/app/transactions/add/page";
import AmountInput from "./AmountInput"; // Tái sử dụng AmountInput xịn sò của chúng ta

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseCurrency = (value: string) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  const numeric = parseInt(cleaned, 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const parsePercent = (value: string) => {
  if (!value) return 0;
  const numeric = parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrency = (value: number) => {
  if (!value) return "0";
  return value.toLocaleString("vi-VN");
};

const formatPercent = (value: number) => {
  if (!value) return "0";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.0+$/, "").replace(/0+$/, "");
};

type CashbackInputProps = {
  transactionAmount: string; // Số tiền của giao dịch chính
  account: Account; // Thông tin tài khoản được chọn
  onCashbackChange: (value: { percent: number; amount: number }) => void;
};

export default function CashbackInput({ transactionAmount, account, onCashbackChange }: CashbackInputProps) {
  const [percentInput, setPercentInput] = useState<string>("0");
  const [amountInput, setAmountInput] = useState<string>("0");

  const transactionValue = useMemo(() => parseCurrency(transactionAmount), [transactionAmount]);

  const accountPercentLimit = useMemo(() => {
    if (account.cashback_percentage == null) return null;
    return Math.max(0, account.cashback_percentage * 100);
  }, [account.cashback_percentage]);

  const amountLimit = useMemo(() => {
    if (transactionValue <= 0) return 0;
    const limitFromPercent =
      accountPercentLimit != null ? Math.floor((accountPercentLimit / 100) * transactionValue) : transactionValue;
    const limitFromMax =
      account.max_cashback_amount != null ? Math.max(0, Math.floor(account.max_cashback_amount)) : transactionValue;
    return Math.max(0, Math.min(limitFromPercent, limitFromMax, transactionValue));
  }, [transactionValue, accountPercentLimit, account.max_cashback_amount]);

  const effectivePercentLimit = useMemo(() => {
    if (transactionValue <= 0) return 0;
    if (amountLimit <= 0) return 0;
    const derived = (amountLimit / transactionValue) * 100;
    if (accountPercentLimit == null) return clamp(derived, 0, 100);
    return clamp(derived, 0, Math.min(accountPercentLimit, 100));
  }, [amountLimit, transactionValue, accountPercentLimit]);

  const updateValues = useCallback(
    (percentValue: number, amountValue: number) => {
      const sanitizedPercent = Number.isFinite(percentValue) ? percentValue : 0;
      const sanitizedAmount = Number.isFinite(amountValue) ? amountValue : 0;

      setPercentInput(formatPercent(Math.max(0, sanitizedPercent)));
      setAmountInput(formatCurrency(Math.max(0, Math.floor(sanitizedAmount))));

      onCashbackChange({
        percent: Math.max(0, Number(sanitizedPercent.toFixed(2))),
        amount: Math.max(0, Math.floor(sanitizedAmount)),
      });
    },
    [onCashbackChange]
  );

  const normalizeByPercent = useCallback(
    (rawPercent: number) => {
      if (transactionValue <= 0) return { percent: 0, amount: 0 };

      const clampedPercent = clamp(rawPercent, 0, effectivePercentLimit || 0);
      const amountFromPercent = Math.floor((clampedPercent / 100) * transactionValue);
      const normalizedAmount = Math.max(0, Math.min(amountFromPercent, amountLimit));
      const finalPercent = transactionValue > 0 ? (normalizedAmount / transactionValue) * 100 : 0;

      return { percent: finalPercent, amount: normalizedAmount };
    },
    [transactionValue, effectivePercentLimit, amountLimit]
  );

  const normalizeByAmount = useCallback(
    (rawAmount: number) => {
      if (transactionValue <= 0) return { percent: 0, amount: 0 };

      const clampedAmount = Math.max(0, Math.min(Math.floor(rawAmount), amountLimit));
      const percentFromAmount = transactionValue > 0 ? (clampedAmount / transactionValue) * 100 : 0;
      const clampedPercent = clamp(percentFromAmount, 0, effectivePercentLimit || 0);
      const amountFromPercent = Math.floor((clampedPercent / 100) * transactionValue);
      const finalAmount = Math.max(0, Math.min(clampedAmount, amountFromPercent, amountLimit));
      const finalPercent = transactionValue > 0 ? (finalAmount / transactionValue) * 100 : 0;

      return { percent: finalPercent, amount: finalAmount };
    },
    [transactionValue, amountLimit, effectivePercentLimit]
  );

  useEffect(() => {
    if (!account.is_cashback_eligible || transactionValue <= 0) {
      setPercentInput("0");
      setAmountInput("0");
      onCashbackChange({ percent: 0, amount: 0 });
      return;
    }

    const defaultAmount = amountLimit;
    const defaultPercent = transactionValue > 0 ? (defaultAmount / transactionValue) * 100 : 0;
    updateValues(defaultPercent, defaultAmount);
  }, [account.is_cashback_eligible, transactionValue, amountLimit, updateValues, onCashbackChange]);

  const handlePercentChange = (value: string) => {
    const numeric = parsePercent(value);
    const normalized = normalizeByPercent(numeric);
    updateValues(normalized.percent, normalized.amount);
  };

  const handleAmountChange = (value: string) => {
    const numeric = parseCurrency(value);
    const normalized = normalizeByAmount(numeric);
    updateValues(normalized.percent, normalized.amount);
  };

  const percentPlaceholder = useMemo(() => {
    if (accountPercentLimit != null && accountPercentLimit > 0) {
      return `${formatPercent(accountPercentLimit)}%`;
    }
    if (effectivePercentLimit > 0) {
      return `${formatPercent(effectivePercentLimit)}%`;
    }
    return "0%";
  }, [accountPercentLimit, effectivePercentLimit]);

  const hintMessage = useMemo(() => {
    if (!account.is_cashback_eligible) {
      return `Thẻ ${account.name} không hỗ trợ cashback.`;
    }

    if (transactionValue <= 0) {
      return "Nhập số tiền giao dịch để tính cashback.";
    }

    const limitParts: string[] = [];
    if (accountPercentLimit != null) {
      limitParts.push(`Tỷ lệ tối đa ${formatPercent(accountPercentLimit)}%`);
    }
    if (account.max_cashback_amount != null) {
      limitParts.push(`Hoàn tiền tối đa ${formatCurrency(Math.floor(account.max_cashback_amount))}đ`);
    }

    const limitPrefix = limitParts.length ? `Giới hạn thẻ: ${limitParts.join(" • ")}.` : "Không có giới hạn cashback được khai báo.";
    const effectivePercent = transactionValue > 0 ? (amountLimit / transactionValue) * 100 : 0;
    const detail = `Giao dịch ${formatCurrency(transactionValue)}đ ⇒ nhận tối đa ${formatCurrency(amountLimit)}đ (~${formatPercent(
      effectivePercent
    )}%).`;

    return `${limitPrefix} ${detail}`;
  }, [account, transactionValue, amountLimit, accountPercentLimit]);

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
      <p className="text-sm font-medium text-blue-800">Thông tin Cashback</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Cashback (%)</label>
          <input
            type="number"
          value={percentInput}
          onChange={(e) => handlePercentChange(e.target.value)}
          min={0}
          max={100}
          step="0.01"
          placeholder={percentPlaceholder}
          className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500 text-lg"
        />
      </div>
        <div className="-mt-6">
          <AmountInput value={amountInput} onChange={handleAmountChange} />
        </div>
      </div>
      <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md leading-relaxed">{hintMessage}</div>
    </div>
  );
}

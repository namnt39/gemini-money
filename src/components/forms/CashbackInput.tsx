"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Account } from "@/app/transactions/add/page";
import { createTranslator } from "@/lib/i18n";

type LastEdited = "percent" | "amount" | null;

type CashbackInputProps = {
  transactionAmount: string;
  account: Account;
  onCashbackChange: (value: { percent: number; amount: number; source: LastEdited }) => void;
};

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
  return `${value.toLocaleString("en-US")} VND`;
};

const formatPercent = (value: number) => {
  if (!value) return "0";
  const fixed = value.toFixed(2);
  return fixed.replace(/\.0+$/, "").replace(/0+$/, "");
};

export default function CashbackInput({ transactionAmount, account, onCashbackChange }: CashbackInputProps) {
  const t = createTranslator();
  const [percentInput, setPercentInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [lastEdited, setLastEdited] = useState<LastEdited>(null);
  const [percentExceeded, setPercentExceeded] = useState(false);
  const [amountExceeded, setAmountExceeded] = useState(false);

  const transactionValue = useMemo(() => parseCurrency(transactionAmount), [transactionAmount]);

  const accountPercentLimit = useMemo(() => {
    if (account.cashback_percentage == null) return null;
    return Math.max(0, account.cashback_percentage * 100);
  }, [account.cashback_percentage]);

  const amountLimit = useMemo(() => {
    if (transactionValue <= 0) return 0;
    const limitFromPercent = (
      accountPercentLimit != null ? Math.floor((accountPercentLimit / 100) * transactionValue) : transactionValue
    );
    const limitFromMax = (
      account.max_cashback_amount != null ? Math.max(0, Math.floor(account.max_cashback_amount)) : transactionValue
    );
    return Math.max(0, Math.min(limitFromPercent, limitFromMax, transactionValue));
  }, [transactionValue, accountPercentLimit, account.max_cashback_amount]);

  const effectivePercentLimit = useMemo(() => {
    if (transactionValue <= 0) return 0;
    if (amountLimit <= 0) return 0;
    const derived = (amountLimit / transactionValue) * 100;
    if (accountPercentLimit == null) return clamp(derived, 0, 100);
    return clamp(derived, 0, Math.min(accountPercentLimit, 100));
  }, [amountLimit, transactionValue, accountPercentLimit]);

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

  const resetValues = useCallback(() => {
    setPercentInput("");
    setAmountInput("");
    setLastEdited(null);
    setPercentExceeded(false);
    setAmountExceeded(false);
    onCashbackChange({ percent: 0, amount: 0, source: null });
  }, [onCashbackChange]);

  useEffect(() => {
    if (!account.is_cashback_eligible || transactionValue <= 0) {
      resetValues();
      return;
    }

    if (lastEdited === "percent") {
      const numericPercent = parsePercent(percentInput);

      if (!percentInput || numericPercent <= 0) {
        setPercentInput("");
        setPercentExceeded(false);

        if (!amountInput) {
          setLastEdited(null);
          onCashbackChange({ percent: 0, amount: 0, source: null });
        } else {
          setLastEdited("amount");
        }
        return;
      }

      const normalized = normalizeByPercent(numericPercent);
      const formattedPercent = normalized.percent > 0 ? formatPercent(normalized.percent) : "";
      setPercentInput((prev) => (prev === formattedPercent ? prev : formattedPercent));

      const limit = effectivePercentLimit || 0;
      const exceeded = limit > 0 ? numericPercent > limit + 1e-6 : numericPercent > 0;
      setPercentExceeded(exceeded);

      onCashbackChange({ percent: normalized.percent, amount: normalized.amount, source: "percent" });
      return;
    }

    if (lastEdited === "amount") {
      const numericAmount = parseCurrency(amountInput);

      if (!amountInput || numericAmount <= 0) {
        setAmountInput("");
        setAmountExceeded(false);

        if (!percentInput) {
          setLastEdited(null);
          onCashbackChange({ percent: 0, amount: 0, source: null });
        } else {
          setLastEdited("percent");
        }
        return;
      }

      const normalized = normalizeByAmount(numericAmount);
      const formattedAmount = normalized.amount > 0 ? formatCurrency(normalized.amount) : "";
      setAmountInput((prev) => (prev === formattedAmount ? prev : formattedAmount));

      const exceeded = numericAmount > amountLimit;
      setAmountExceeded(exceeded);

      onCashbackChange({ percent: normalized.percent, amount: normalized.amount, source: "amount" });
      return;
    }

    onCashbackChange({ percent: 0, amount: 0, source: null });
  }, [
    account.is_cashback_eligible,
    transactionValue,
    percentInput,
    amountInput,
    lastEdited,
    amountLimit,
    effectivePercentLimit,
    normalizeByAmount,
    normalizeByPercent,
    onCashbackChange,
    resetValues,
  ]);

  const handlePercentChange = (value: string) => {
    if (!value) {
      setPercentInput("");
      setPercentExceeded(false);

      if (lastEdited === "percent") {
        if (amountInput) {
          setLastEdited("amount");
        } else {
          setLastEdited(null);
          onCashbackChange({ percent: 0, amount: 0 });
        }
      }
      return;
    }

    setPercentInput(value);
    setLastEdited("percent");
  };

  const handleAmountChange = (value: string) => {
    if (!value) {
      setAmountInput("");
      setAmountExceeded(false);

      if (lastEdited === "amount") {
        if (percentInput) {
          setLastEdited("percent");
        } else {
          setLastEdited(null);
          onCashbackChange({ percent: 0, amount: 0 });
        }
      }
      return;
    }

    setAmountInput(value);
    setLastEdited("amount");
  };

  const amountSuggestion = useMemo(() => {
    if (transactionValue <= 0) return 0;
    if (percentInput) {
      const normalized = normalizeByPercent(parsePercent(percentInput));
      return normalized.amount;
    }
    return amountLimit;
  }, [transactionValue, percentInput, normalizeByPercent, amountLimit]);

  const percentSuggestion = useMemo(() => {
    if (transactionValue <= 0) return 0;
    if (amountInput) {
      const normalized = normalizeByAmount(parseCurrency(amountInput));
      return normalized.percent;
    }
    return effectivePercentLimit;
  }, [transactionValue, amountInput, normalizeByAmount, effectivePercentLimit]);

  const hintMessage = useMemo(() => {
    if (!account.is_cashback_eligible) {
      return `Card ${account.name} does not support cashback.`;
    }

    if (transactionValue <= 0) {
      return "Enter the transaction amount to calculate cashback limits.";
    }

    const limitParts: string[] = [];
    if (accountPercentLimit != null) {
      limitParts.push(`Maximum rate ${formatPercent(accountPercentLimit)}%`);
    }
    if (account.max_cashback_amount != null) {
      limitParts.push(`Maximum cashback ${formatCurrency(Math.floor(account.max_cashback_amount))}`);
    }

    const limitPrefix =
      limitParts.length > 0
        ? `Card limits: ${limitParts.join(" • ")}.`
        : "This card does not have specific cashback limit information.";

    if (amountLimit <= 0) {
      return `${limitPrefix} A ${formatCurrency(transactionValue)} transaction is currently not eligible for cashback.`;
    }

    const effectivePercent = transactionValue > 0 ? (amountLimit / transactionValue) * 100 : 0;
    const detail = `For a ${formatCurrency(transactionValue)} transaction you can earn up to ${formatCurrency(
      amountLimit
    )} (~${formatPercent(effectivePercent)}%).`;

    return `${limitPrefix} ${detail}`;
  }, [
    account,
    transactionValue,
    amountLimit,
    accountPercentLimit,
  ]);

  const canEdit = account.is_cashback_eligible && transactionValue > 0;

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-blue-800">{t("transactionForm.labels.cashbackInfo")}</p>
        {canEdit && amountLimit > 0 && (
          <span className="text-xs font-medium text-blue-700">
            Up to {formatCurrency(amountLimit)} (~{formatPercent((amountLimit / transactionValue) * 100)}%)
          </span>
        )}
      </div>

      {!canEdit && (
        <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md">
          Enter the transaction amount before adding cashback details.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Cashback (%)</label>
          <input
            type="number"
            value={percentInput}
            onChange={(e) => handlePercentChange(e.target.value)}
            min={0}
            max={100}
            step="0.01"
            placeholder={
              effectivePercentLimit > 0
                ? `${formatPercent(effectivePercentLimit)}%`
                : amountLimit > 0
                ? `${formatPercent((amountLimit / transactionValue) * 100)}%`
                : "0%"
            }
            className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500 text-lg disabled:bg-gray-100 disabled:text-gray-500"
            disabled={!canEdit}
          />
          {canEdit && (
            <>
              <p className="mt-1 text-xs text-gray-500">
                {percentInput
                  ? `Equivalent to about ${formatCurrency(amountSuggestion)} in cashback.`
                  : amountLimit > 0
                  ? `Suggestion: up to ${formatPercent(effectivePercentLimit)}% to earn ${formatCurrency(amountLimit)}.`
                  : "No cashback rate is available for this transaction."}
              </p>
              {percentExceeded && (
                <p className="mt-1 text-xs text-red-600">
                  Cannot exceed {formatPercent(effectivePercentLimit)}% due to card or transaction limits.
                </p>
              )}
            </>
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Cashback (VND)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={amountLimit > 0 ? formatCurrency(amountLimit) : "0"}
            className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500 text-lg disabled:bg-gray-100 disabled:text-gray-500"
            disabled={!canEdit}
          />
          {canEdit && (
            <>
              <p className="mt-1 text-xs text-gray-500">
                {amountInput
                  ? `Equivalent to roughly ${formatPercent(percentSuggestion)}%.`
                  : amountLimit > 0
                  ? `Suggestion: the maximum cashback amount is ${formatCurrency(amountLimit)}.`
                  : "No cashback amount is available for this transaction."}
              </p>
              {amountExceeded && (
                <p className="mt-1 text-xs text-red-600">
                  Cannot exceed {formatCurrency(amountLimit)} because of card or transaction limits.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded-md leading-relaxed">{hintMessage}</div>
    </div>
  );
}

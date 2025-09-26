"use client";

import { useState, useMemo } from "react";
import Tooltip from "../ui/Tooltip";
import MiniCalculator from "./MiniCalculator";
import { createTranslator } from "@/lib/i18n";

const formatNumber = (value: string) => {
  if (!value) return "";
  const raw = value.replace(/\D/g, "");
  if (raw === "") return "";
  const num = parseInt(raw, 10);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const toReadableWords = (numStr: string) => {
  const raw = numStr.replace(/,/g, "");
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num === 0) {
    return "";
  }

  const formatter = new Intl.NumberFormat("vi-VN");
  const units = [
    { value: 1_000_000_000, label: "tỷ" },
    { value: 1_000_000, label: "triệu" },
    { value: 1_000, label: "nghìn" },
  ];

  const segments: string[] = [];
  let remaining = num;

  units.forEach(({ value, label }) => {
    if (remaining >= value) {
      const count = Math.floor(remaining / value);
      segments.push(`${formatter.format(count)} ${label}`);
      remaining %= value;
    }
  });

  if (segments.length === 0) {
    return `${formatter.format(num)} đồng`;
  }

  if (remaining > 0) {
    segments.push(`${formatter.format(remaining)} đồng`);
  } else {
    const lastIndex = segments.length - 1;
    segments[lastIndex] = `${segments[lastIndex]} đồng`;
  }

  return segments.join(" ");
};

// --- Props ---
type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function AmountInput({ value, onChange }: AmountInputProps) {
  const t = createTranslator();
  const [showCalc, setShowCalc] = useState(false);

  const suggestions = useMemo(() => {
    const firstDigit = value.charAt(0);
    if (!firstDigit || !/[1-9]/.test(firstDigit)) return [];
    const num = parseInt(firstDigit, 10);
    return [num * 1000, num * 10000, num * 100000];
  }, [value]);

  // Handlers tách gọn
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatNumber(e.target.value));
  };

  const handleSuggestionClick = (amount: number) => {
    onChange(formatNumber(amount.toString()));
  };

  const handleClear = () => onChange("");

  return (
    <div>
      <label
        htmlFor="amount"
        className="block text-sm font-medium text-gray-700"
      >
        {t("common.amount")}
      </label>

      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          type="text"
          id="amount"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          className="block w-full rounded-md border-gray-300 py-3 px-4 focus:border-indigo-500 focus:ring-indigo-500 text-lg"
          placeholder="0"
          required
        />

        {/* Action buttons (Calculator + Clear) */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
          <Tooltip text={t("amountInput.openCalculator")}>
            <button
              type="button"
              aria-label={t("amountInput.openCalculatorAria")}
              onClick={() => setShowCalc((s) => !s)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </button>
          </Tooltip>

          {!!value && (
            <Tooltip text={t("amountInput.clear")}>
              <button
                type="button"
                aria-label={t("amountInput.clearAria")}
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </Tooltip>
          )}
        </div>

        {showCalc && (
          <MiniCalculator
            initialValue={value}
            onApply={onChange}
            onClose={() => setShowCalc(false)}
          />
        )}
      </div>

      <div className="mt-2 flex justify-between items-center h-8">
        <div className="flex space-x-2">
          {suggestions.map((sugg) => (
            <button
              type="button"
              key={sugg}
              onClick={() => handleSuggestionClick(sugg)}
              className="px-2 py-1 text-xs text-indigo-700 bg-indigo-100 rounded-full hover:bg-indigo-200"
            >
              {formatNumber(sugg.toString())}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500 italic">
          {toReadableWords(value)}
        </div>
      </div>
    </div>
  );
}

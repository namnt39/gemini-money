"use client";

import { useMemo, useState } from "react";

import { createTranslator } from "@/lib/i18n";

import Tooltip from "../ui/Tooltip";
import MiniCalculator from "./MiniCalculator";

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
    <div className="space-y-2">
      <label htmlFor="amount" className="block text-sm font-semibold text-gray-800">
        {t("common.amount")}
      </label>

      <div className="relative rounded-xl border border-gray-300 bg-white shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <input
          type="text"
          id="amount"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          className="block w-full rounded-xl border-0 bg-transparent pl-14 pr-24 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
          placeholder="0"
          required
        />

        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4" aria-hidden="true">
          <span className="text-sm font-medium uppercase tracking-wide text-gray-400">VND</span>
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center gap-2 px-3">
          <Tooltip text={t("amountInput.openCalculator")}>
            <button
              type="button"
              aria-label={t("amountInput.openCalculatorAria")}
              onClick={() => setShowCalc((s) => !s)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray-400 transition hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 0v2m8-2v2M8 10h8m-8 4h2m2 0h2m-6 4h8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </Tooltip>

          {value ? (
            <Tooltip text={t("amountInput.clear")}>
              <button
                type="button"
                aria-label={t("amountInput.clearAria")}
                onClick={handleClear}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-400 transition hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm2.121-10.95a.75.75 0 1 0-1.06-1.06L10 7.06 8.94 6a.75.75 0 1 0-1.06 1.06L8.94 8.12 7.88 9.18a.75.75 0 0 0 1.06 1.06L10 9.18l1.06 1.06a.75.75 0 0 0 1.06-1.06L11.06 8.12l1.06-1.07Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </Tooltip>
          ) : null}
        </div>

        {showCalc ? (
          <MiniCalculator initialValue={value} onApply={onChange} onClose={() => setShowCalc(false)} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {suggestions.map((sugg) => (
            <button
              type="button"
              key={sugg}
              onClick={() => handleSuggestionClick(sugg)}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              {formatNumber(sugg.toString())}
            </button>
          ))}
        </div>
        <div className="text-sm italic text-gray-500">{toReadableWords(value)}</div>
      </div>
    </div>
  );
}

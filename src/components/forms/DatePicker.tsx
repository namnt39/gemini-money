"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [year, month, day] = trimmed.split("-").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

const formatISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const clampDate = (date: Date, min?: string, max?: string) => {
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  let next = date;
  if (minDate && next < minDate) {
    next = minDate;
  }
  if (maxDate && next > maxDate) {
    next = maxDate;
  }
  return next;
};

const isBeforeMin = (date: Date, min?: string) => {
  const minDate = parseDate(min);
  return Boolean(minDate && date < minDate);
};

const isAfterMax = (date: Date, max?: string) => {
  const maxDate = parseDate(max);
  return Boolean(maxDate && date > maxDate);
};

type DatePickerProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  description?: string;
};

export default function DatePicker({ id, label, value, onChange, min, max, required, description }: DatePickerProps) {
  const fallbackId = useId();
  const popoverId = useId();
  const inputId = id ?? fallbackId;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const parsedValue = useMemo(() => parseDate(value) ?? new Date(), [value]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => clampDate(toStartOfMonth(parsedValue), min, max));
  const [inputValue, setInputValue] = useState<string>(value);

  useEffect(() => {
    setInputValue(value);
    const parsed = parseDate(value);
    if (parsed) {
      setVisibleMonth(toStartOfMonth(parsed));
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const formattedDisplay = useMemo(() => {
    const parsed = parseDate(inputValue);
    if (!parsed) {
      return inputValue;
    }
    return formatISO(parsed);
  }, [inputValue]);

  const days = useMemo(() => {
    const start = new Date(visibleMonth);
    const offset = start.getDay();
    start.setDate(start.getDate() - offset);
    const weeks: Array<{
      date: Date;
      inCurrentMonth: boolean;
      isToday: boolean;
      iso: string;
      disabled: boolean;
    }> = [];
    for (let i = 0; i < 42; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const inCurrentMonth = current.getMonth() === visibleMonth.getMonth();
      const iso = formatISO(current);
      const disabled = isBeforeMin(current, min) || isAfterMax(current, max);
      weeks.push({
        date: current,
        inCurrentMonth,
        isToday: formatISO(new Date()) === iso,
        iso,
        disabled,
      });
    }
    return weeks;
  }, [visibleMonth, min, max]);

  const handleSelectDay = useCallback(
    (nextDate: Date) => {
      const iso = formatISO(nextDate);
      setInputValue(iso);
      onChange(iso);
      setOpen(false);
      setVisibleMonth(toStartOfMonth(nextDate));
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleInputBlur = useCallback(() => {
    const parsed = parseDate(inputValue);
    if (parsed) {
      const iso = formatISO(parsed);
      setInputValue(iso);
      onChange(iso);
      setVisibleMonth(toStartOfMonth(parsed));
      return;
    }
    if (!inputValue.trim()) {
      const iso = formatISO(parsedValue);
      setInputValue(iso);
      onChange(iso);
    }
  }, [inputValue, onChange, parsedValue]);

  const handlePrevMonth = useCallback(() => {
    setVisibleMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1, 1);
      return clampDate(toStartOfMonth(next), min, max);
    });
  }, [max, min]);

  const handleNextMonth = useCallback(() => {
    setVisibleMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1, 1);
      return clampDate(toStartOfMonth(next), min, max);
    });
  }, [max, min]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);
  }, [visibleMonth]);

  const selectedIso = useMemo(() => formatISO(parsedValue), [parsedValue]);

  return (
    <div ref={rootRef} className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-800">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      {description ? <p className="text-xs text-gray-500">{description}</p> : null}
      <div className="relative rounded-xl border border-gray-300 bg-white shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
        <input
          ref={inputRef}
          id={inputId}
          value={formattedDisplay}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={handleInputBlur}
          placeholder="YYYY-MM-DD"
          className="block w-full rounded-xl border-0 bg-transparent py-3 pl-4 pr-12 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="button"
          aria-label="Open calendar"
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex h-full w-12 items-center justify-center text-gray-500 transition hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5"
          >
            <path
              d="M6 3v2m8-2v2M4.5 7h11m-11 0A1.5 1.5 0 0 0 3 8.5v7A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 15.5 7h-11Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="7" y="10" width="3" height="3" rx="0.5" fill="currentColor" />
          </svg>
        </button>
        {open ? (
          <div
            id={popoverId}
            role="dialog"
            aria-modal="false"
            className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
                aria-label="Previous month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                  <path d="m11.5 5-4 5 4 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="text-sm font-semibold text-gray-800">{monthLabel}</div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-indigo-200 hover:text-indigo-600"
                aria-label="Next month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                  <path d="m8.5 5 4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
              {DAY_LABELS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
              {days.map(({ date, inCurrentMonth, isToday, iso, disabled }) => {
                const isSelected = iso === selectedIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => handleSelectDay(date)}
                    disabled={disabled}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition ${
                      disabled
                        ? "cursor-not-allowed border-transparent text-gray-300"
                        : isSelected
                        ? "border-indigo-500 bg-indigo-500 text-white shadow"
                        : isToday
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : inCurrentMonth
                        ? "border-transparent text-gray-700 hover:border-indigo-200 hover:bg-indigo-50"
                        : "border-transparent text-gray-400 hover:border-indigo-200 hover:bg-indigo-50"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

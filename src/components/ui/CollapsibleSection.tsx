"use client";

import { ReactNode, useMemo, useState } from "react";

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M5 8.5 10 13l5-4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className="h-4 w-4"
  >
    <path d="M5 11.5 10 7l5 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type CollapsibleSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  openLabel?: string;
  closeLabel?: string;
};

export default function CollapsibleSection({
  title,
  description,
  children,
  actions,
  open,
  defaultOpen = false,
  onToggle,
  openLabel = "Show section",
  closeLabel = "Hide section",
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = useMemo(() => open !== undefined, [open]);
  const resolvedOpen = isControlled ? Boolean(open) : internalOpen;

  const handleToggle = () => {
    const next = !resolvedOpen;
    if (!isControlled) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={resolvedOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-50"
      >
        <span className="flex items-center gap-3 text-left">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            {resolvedOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </span>
          <span className="flex flex-col">
            <span>{title}</span>
            {description ? (
              <span className="text-xs font-normal normal-case text-gray-500">{description}</span>
            ) : null}
          </span>
        </span>
        <span className="flex items-center gap-3">
          {actions}
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            {resolvedOpen ? closeLabel : openLabel}
          </span>
        </span>
      </button>
      {resolvedOpen ? <div className="space-y-4 border-t border-gray-200 p-4">{children}</div> : null}
    </div>
  );
}

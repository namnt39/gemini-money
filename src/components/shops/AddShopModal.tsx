"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import ConfirmDialog from "@/components/ui/ConfirmDialog";

type AddShopModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (values: { name: string; type?: string; notes?: string | null }) => void;
  onNavigateToTransactions?: () => void;
  availableTypes?: string[];
  origin?: "shops" | "transactions";
  onBack?: () => void;
};

type PendingAction = "close" | "back" | "navigate" | null;

const normalizeTypes = (types?: string[]) => {
  if (!types || types.length === 0) {
    return [];
  }
  const unique = new Map<string, string>();
  types.forEach((raw) => {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, trimmed);
    }
  });
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
};

export default function AddShopModal({
  open,
  onClose,
  onCreate,
  onNavigateToTransactions,
  availableTypes,
  origin = "shops",
  onBack,
}: AddShopModalProps) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customType, setCustomType] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const customTypeInputRef = useRef<HTMLInputElement | null>(null);

  const typeOptions = useMemo(() => normalizeTypes(availableTypes), [availableTypes]);

  useEffect(() => {
    if (!open) {
      setName("");
      setNotes("");
      setSelectedType(null);
      setIsAddingCustomType(false);
      setCustomType("");
      setShowConfirm(false);
      setPendingAction(null);
    }
  }, [open]);

  useEffect(() => {
    if (isAddingCustomType) {
      const id = window.setTimeout(() => {
        customTypeInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(id);
    }
    return () => undefined;
  }, [isAddingCustomType]);

  const resolvedType = useMemo(() => {
    if (isAddingCustomType) {
      return customType.trim();
    }
    return (selectedType ?? "").trim();
  }, [customType, isAddingCustomType, selectedType]);

  const isDirty = useMemo(() => {
    return Boolean(name.trim() || notes.trim() || resolvedType);
  }, [name, notes, resolvedType]);

  const runAction = useCallback(
    (action: PendingAction) => {
      if (action === "navigate") {
        onNavigateToTransactions?.();
        return;
      }
      if (action === "back") {
        if (onBack) {
          onBack();
        } else {
          onClose();
        }
        return;
      }
      onClose();
    },
    [onBack, onClose, onNavigateToTransactions]
  );

  const requestExit = useCallback(
    (action: PendingAction) => {
      if (!action) {
        return;
      }
      if (isDirty) {
        setPendingAction(action);
        setShowConfirm(true);
        return;
      }
      runAction(action);
    },
    [isDirty, runAction]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      const trimmedNotes = notes.trim();
      const trimmedType = resolvedType;
      onCreate({
        name: trimmedName,
        type: trimmedType ? trimmedType : undefined,
        notes: trimmedNotes ? trimmedNotes : null,
      });
    },
    [name, notes, onCreate, resolvedType]
  );

  const handleConfirmDiscard = useCallback(() => {
    const action = pendingAction;
    setShowConfirm(false);
    setPendingAction(null);
    if (action) {
      runAction(action);
    }
  }, [pendingAction, runAction]);

  const handleCancelDiscard = useCallback(() => {
    setShowConfirm(false);
    setPendingAction(null);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestExit("close");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, requestExit]);

  if (!open) {
    return null;
  }

  const heading = origin === "transactions" ? "Quick add shop" : "Add new shop";
  const subheading = origin === "transactions" ? "This shop will be available for your transaction form." : "Create a shop profile to reuse later.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="absolute inset-0" onClick={() => requestExit("close")} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={() => requestExit("back")}
              className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <path d="M12.5 5 7.5 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
              <p className="text-xs text-gray-500">{subheading}</p>
            </div>
            <button
              type="button"
              onClick={() => requestExit("close")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-rose-200 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="space-y-5 bg-slate-50 px-6 py-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800" htmlFor="shop-name-input">
                Name
              </label>
              <input
                id="shop-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter shop name"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800">Type</span>
                {isAddingCustomType ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustomType(false);
                      setCustomType("");
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  >
                    Cancel new type
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {typeOptions.map((option) => {
                  const isActive = !isAddingCustomType && option === selectedType;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setSelectedType(null);
                          return;
                        }
                        setSelectedType(option);
                        setIsAddingCustomType(false);
                        setCustomType("");
                      }}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500 text-white shadow"
                          : "border-gray-300 bg-white text-gray-600 hover:border-indigo-200 hover:text-indigo-700"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustomType(true);
                    setSelectedType(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">+</span>
                  New type
                </button>
              </div>
              {isAddingCustomType ? (
                <input
                  ref={customTypeInputRef}
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
                  placeholder="Type name (e.g. ecommerce, bank)"
                  className="w-full rounded-xl border border-indigo-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              ) : null}
              {!typeOptions.length && !isAddingCustomType ? (
                <p className="text-xs text-gray-500">No saved types yet. Add one above.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-800" htmlFor="shop-notes-input">
                Notes
              </label>
              <textarea
                id="shop-notes-input"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Additional details"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => requestExit("back")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Back
            </button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {onNavigateToTransactions ? (
                <button
                  type="button"
                  onClick={() => requestExit("navigate")}
                  className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  Back to transactions
                </button>
              ) : null}
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Create shop
              </button>
            </div>
          </footer>
        </form>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Discard changes?"
        description="You have unsaved information for this shop. Leaving now will discard your input."
        cancelLabel="Stay"
        confirmLabel="Discard"
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
}

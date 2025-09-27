"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { useAppShell } from "@/components/AppShellProvider";
import { createTranslator } from "@/lib/i18n";
import { normalizeTransactionNature } from "@/lib/transactionNature";
import { ClearIcon } from "@/components/Icons";

import type { CategoryListItem } from "./page";
import { deleteCategory, deleteCategoriesBulk } from "./actions";

type NatureFilter = "all" | "EX" | "IN" | "TF" | "DE";

type CategoriesViewProps = {
  categories: CategoryListItem[];
  errorMessage?: string;
};

const natureFilters: NatureFilter[] = ["all", "EX", "IN", "TF", "DE"];

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" />
    <path
      fillRule="evenodd"
      d="M5 6a1 1 0 0 1 1-1h2.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 0 1.414l-5.414 5.414A1 1 0 0 1 8.586 18H7a1 1 0 0 1-1-1V6Z"
      clipRule="evenodd"
    />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
    <path
      fillRule="evenodd"
      d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2h.293l.853 10.235A2 2 0 0 0 7.138 18h5.724a2 2 0 0 0 1.992-1.765L15.707 6H16a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9Zm-1 6a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V8Zm4-1a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1Z"
      clipRule="evenodd"
    />
  </svg>
);

const naturePalette: Record<NatureFilter, { active: string; inactive: string }> = {
  all: {
    active: "border-slate-900 bg-slate-900 text-white shadow",
    inactive: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  },
  EX: {
    active: "border-rose-600 bg-rose-500 text-white shadow",
    inactive: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  },
  IN: {
    active: "border-emerald-600 bg-emerald-500 text-white shadow",
    inactive: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  TF: {
    active: "border-sky-600 bg-sky-500 text-white shadow",
    inactive: "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
  },
  DE: {
    active: "border-amber-600 bg-amber-500 text-white shadow",
    inactive: "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
};

const resolveNature = (category: CategoryListItem) => {
  const raw = category.transaction_nature ?? undefined;
  return normalizeTransactionNature(raw ?? null) ?? undefined;
};

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export default function CategoriesView({ categories, errorMessage }: CategoriesViewProps) {
  const t = createTranslator();
  const router = useRouter();
  const { showSuccess } = useAppShell();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [natureFilter, setNatureFilter] = useState<NatureFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return categories.filter((category) => {
      const nature = resolveNature(category);
      if (natureFilter !== "all" && nature !== natureFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return category.name.toLowerCase().includes(normalizedSearch);
    });
  }, [categories, natureFilter, searchTerm]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(filteredCategories.map((category) => category.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [filteredCategories]);

  const allVisibleSelected = useMemo(() => {
    return filteredCategories.length > 0 && filteredCategories.every((category) => selectedIds.has(category.id));
  }, [filteredCategories, selectedIds]);

  const selectedRecords = useMemo(
    () => categories.filter((category) => selectedIds.has(category.id)),
    [categories, selectedIds]
  );
  const hasSelection = selectedRecords.length > 0;

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredCategories.forEach((category) => next.delete(category.id));
      } else {
        filteredCategories.forEach((category) => next.add(category.id));
      }
      return next;
    });
  }, [allVisibleSelected, filteredCategories]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (record: CategoryListItem) => {
      const shouldDelete = confirm(t("categories.actions.deleteConfirm"));
      if (!shouldDelete) {
        return;
      }

      setActionError(null);
      setDeletingId(record.id);

      try {
        const result = await deleteCategory({ categoryId: record.id });

        if (!result.success) {
          setActionError(result.message || t("categories.actions.deleteError"));
          return;
        }

        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });

        showSuccess(t("categories.actions.deleteSuccess"));
        router.refresh();
      } catch (error) {
        console.error("Unable to delete category:", error);
        setActionError(t("categories.actions.deleteError"));
      } finally {
        setDeletingId(null);
      }
    },
    [router, showSuccess, t]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRecords.length === 0) {
      return;
    }
    const shouldDelete = confirm(t("categories.actions.deleteAllConfirm"));
    if (!shouldDelete) {
      return;
    }

    setActionError(null);
    setIsBulkDeleting(true);

    try {
      const payload = selectedRecords.map((record) => ({ categoryId: record.id }));
      const result = await deleteCategoriesBulk(payload);
      if (!result.success) {
        setActionError(result.message || t("categories.actions.deleteAllError"));
        return;
      }

      showSuccess(t("categories.actions.deleteAllSuccess"));
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      console.error("Unable to delete selected categories:", error);
      setActionError(t("categories.actions.deleteAllError"));
    } finally {
      setIsBulkDeleting(false);
    }
  }, [router, selectedRecords, showSuccess, t]);

  const natureLabels = useMemo(() => {
    return {
      all: t("categories.filters.allTypes"),
      EX: t("categories.nature.EX"),
      IN: t("categories.nature.IN"),
      TF: t("categories.nature.TF"),
      DE: t("categories.nature.DE"),
    } satisfies Record<NatureFilter, string>;
  }, [t]);

  const resolveNatureLabel = useCallback(
    (category: CategoryListItem) => {
      const nature = resolveNature(category);
      if (!nature) {
        return natureLabels.all;
      }
      const key = nature as NatureFilter;
      return natureLabels[key] ?? nature;
    },
    [natureLabels]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {errorMessage ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
      ) : null}

      {actionError ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      ) : null}

      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("categories.filters.typeLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {natureFilters.map((value) => {
                const palette = naturePalette[value];
                const isActive = natureFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNatureFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      isActive ? palette.active : palette.inactive
                    }`}
                  >
                    {natureLabels[value]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/categories/add"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                {t("categories.addButton")}
              </Link>
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!hasSelection || isBulkDeleting}
                aria-disabled={!hasSelection || isBulkDeleting}
                aria-busy={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                ) : (
                  <TrashIcon />
                )}
                <span>{t("categories.actions.deleteAll")}</span>
              </button>
            </div>

            <div className="w-full sm:max-w-xs">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t("common.searchPlaceholder")}
                  aria-label={t("categories.filters.searchPlaceholder")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-24 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                {searchTerm ? (
                  <div className="absolute inset-y-1.5 right-2 flex items-center">
                    <Tooltip label={t("common.clear")}>
                      <button
                        type="button"
                        onClick={handleSearchClear}
                        className="inline-flex items-center justify-center rounded-md border border-transparent p-2 text-indigo-600 transition hover:border-indigo-100 hover:bg-indigo-50"
                        aria-label={t("common.clear")}
                      >
                        <ClearIcon />
                      </button>
                    </Tooltip>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="sticky left-0 z-20 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label={t("transactions.filters.selectAll")}
                  checked={allVisibleSelected && filteredCategories.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("categories.tableHeaders.icon")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("categories.tableHeaders.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("categories.tableHeaders.type")}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((category) => {
              const isSelected = selectedIds.has(category.id);
              const rowBackground = isSelected ? "bg-indigo-50" : "bg-white";
              const natureLabel = resolveNatureLabel(category);

              return (
                <tr key={category.id} className={`${rowBackground} border-b border-gray-200`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 ${rowBackground}`}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={isSelected}
                      onChange={() => toggleSelection(category.id)}
                      aria-label={t("transactions.filters.selectAll")}
                    />
                  </td>
                  <td className={`px-4 py-3 ${rowBackground}`}>
                    {category.image_url ? (
                      <RemoteImage
                        src={category.image_url}
                        alt={category.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold uppercase text-gray-600">
                        {getInitials(category.name)}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-medium text-gray-800 ${rowBackground}`}>{category.name}</td>
                  <td className={`px-4 py-3 text-gray-600 ${rowBackground}`}>{natureLabel}</td>
                  <td className={`px-4 py-3 text-right ${rowBackground}`}>
                    <div className="flex items-center justify-end gap-2">
                      <Tooltip label={t("categories.actions.editTooltip")}> 
                        <button
                          type="button"
                          className="rounded border border-gray-300 bg-white p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                          aria-label={t("categories.actions.editTooltip")}
                          disabled
                        >
                          <PencilIcon />
                        </button>
                      </Tooltip>
                      <Tooltip label={t("categories.actions.deleteTooltip")}>
                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          className="rounded border border-gray-300 bg-white p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={t("categories.actions.deleteTooltip")}
                          aria-busy={deletingId === category.id}
                          disabled={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                          ) : (
                            <TrashIcon />
                          )}
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredCategories.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {searchTerm.trim()
                    ? t("categories.filters.noResults")
                    : t("categories.emptyState")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

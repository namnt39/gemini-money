"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { createTranslator } from "@/lib/i18n";

import type { CategoryRecord } from "./page";

type NatureFilter = "all" | "EX" | "IN" | "TR" | "DE";

type CategoriesViewProps = {
  categories: CategoryRecord[];
  errorMessage?: string;
};

const natureFilters: NatureFilter[] = ["all", "EX", "IN", "TR", "DE"];

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

const resolveNature = (category: CategoryRecord) => {
  const raw = category.transaction_nature ?? category.categories?.transaction_nature ?? undefined;
  return raw ? raw.toUpperCase() : undefined;
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
  const [natureFilter, setNatureFilter] = useState<NatureFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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

  const natureLabels = useMemo(() => {
    return {
      all: t("categories.filters.allTypes"),
      EX: t("categories.nature.EX"),
      IN: t("categories.nature.IN"),
      TR: t("categories.nature.TR"),
      DE: t("categories.nature.DE"),
    } satisfies Record<NatureFilter, string>;
  }, [t]);

  const resolveNatureLabel = useCallback(
    (category: CategoryRecord) => {
      const nature = resolveNature(category);
      return nature ? natureLabels[(nature as NatureFilter) || "all"] ?? nature : natureLabels.all;
    },
    [natureLabels]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {errorMessage ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
      ) : null}

      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("categories.filters.typeLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {natureFilters.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNatureFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    natureFilter === value
                      ? "bg-indigo-600 text-white shadow"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {natureLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder=""
              aria-label={t("categories.filters.searchPlaceholder")}
              className="w-full min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:max-w-xs"
            />

            <Link
              href="/categories/add"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              {t("categories.addButton")}
            </Link>
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
                          className="rounded border border-gray-300 bg-white p-2 text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={t("categories.actions.deleteTooltip")}
                          disabled
                        >
                          <TrashIcon />
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

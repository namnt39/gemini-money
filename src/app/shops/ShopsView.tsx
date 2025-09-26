"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { ClearIcon } from "@/components/Icons";
import { createTranslator } from "@/lib/i18n";

import type { Shop } from "../transactions/add/formData";

type ShopsViewProps = {
  shops: Shop[];
  errorMessage?: string;
};

type TypeFilter = "all" | string;

const formatCreatedAt = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const normalizeType = (value: string | null | undefined) => {
  if (!value) {
    return "other";
  }
  return value.toLowerCase();
};

export default function ShopsView({ shops, errorMessage }: ShopsViewProps) {
  const t = createTranslator();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const availableTypes = useMemo(() => {
    const unique = new Set<string>();
    shops.forEach((shop) => {
      if (shop.type) {
        unique.add(normalizeType(shop.type));
      }
    });
    return Array.from(unique).sort();
  }, [shops]);

  const filteredShops = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return shops.filter((shop) => {
      const matchesType =
        typeFilter === "all" || normalizeType(shop.type) === typeFilter || (typeFilter === "other" && !shop.type);
      if (!matchesType) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return shop.name.toLowerCase().includes(normalizedSearch);
    });
  }, [shops, searchTerm, typeFilter]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const typeOptions = useMemo(() => {
    const base: { label: string; value: TypeFilter }[] = [
      { value: "all", label: t("shops.filters.allTypes") },
    ];
    const mapped = availableTypes.map((type) => {
      const key = `shops.types.${type}` as const;
      const translation = t(key);
      const label = translation === key ? type.charAt(0).toUpperCase() + type.slice(1) : translation;
      return { value: type, label };
    });
    return [...base, ...mapped];
  }, [availableTypes, t]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {errorMessage ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
        ) : null}
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-lg">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                role="searchbox"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("shops.filters.searchPlaceholder")}
                aria-label={t("shops.filters.searchPlaceholder")}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-16 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-type-filter">
              {t("shops.filters.typeLabel")}
            </label>
            <select
              id="shop-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
          <span>
            {t("shops.summary.count", { count: filteredShops.length })}
          </span>
        </div>
        <div className="p-4">
          {filteredShops.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("shops.empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredShops.map((shop) => {
                const typeKey = normalizeType(shop.type);
                const typeKeyPath = `shops.types.${typeKey}` as const;
                const translatedType = t(typeKeyPath);
                const displayType = translatedType === typeKeyPath
                  ? typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
                  : translatedType;
                const initials = shop.name
                  .split(" ")
                  .map((word) => word.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div key={shop.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                        {shop.image_url ? (
                          <RemoteImage
                            src={shop.image_url}
                            alt={shop.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{shop.name}</p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {displayType}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-500">{t("shops.fields.type")}</dt>
                        <dd className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                          {displayType}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="font-medium text-gray-500">{t("shops.fields.created")}</dt>
                        <dd>{formatCreatedAt(shop.created_at ?? null)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { ClearIcon } from "@/components/Icons";
import { createTranslator, isTranslationKey } from "@/lib/i18n";
import { useAppShell } from "@/components/AppShellProvider";
import AddShopModal from "@/components/shops/AddShopModal";

import type { Shop } from "../transactions/add/formData";

type ShopsViewProps = {
  shops: Shop[];
  errorMessage?: string;
  returnTo?: string;
  shouldOpenModal?: boolean;
};

type TypeFilter = "all" | string;

type ShopRecord = Shop & { notes?: string | null };

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

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const getTypeLabel = (value: string | null | undefined, t: ReturnType<typeof createTranslator>) => {
  if (!value) {
    return "-";
  }
  if (isTranslationKey(value)) {
    return t(value);
  }
  const normalized = value.toLowerCase();
  const translationKey = `shops.types.${normalized}`;
  if (isTranslationKey(translationKey)) {
    return t(translationKey);
  }
  return value;
};

const buildInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export default function ShopsView({ shops, errorMessage, returnTo, shouldOpenModal }: ShopsViewProps) {
  const t = createTranslator();
  const { navigate, showSuccess } = useAppShell();

  const [records, setRecords] = useState<ShopRecord[]>(() => (Array.isArray(shops) ? [...shops] : []));
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState<boolean>(Boolean(shouldOpenModal));
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (shouldOpenModal) {
      setAddModalOpen(true);
    }
  }, [shouldOpenModal]);

  useEffect(() => {
    setRecords((prev) => {
      const existing = new Map(prev.map((shop) => [shop.id, shop] as const));
      shops.forEach((shop) => {
        existing.set(shop.id, { ...existing.get(shop.id), ...shop });
      });
      return Array.from(existing.values());
    });
  }, [shops]);

  useEffect(() => {
    if (!activeId && records.length > 0) {
      setActiveId(records[0].id);
      return;
    }
    if (activeId && !records.some((record) => record.id === activeId)) {
      setActiveId(records.length > 0 ? records[0].id : null);
    }
  }, [activeId, records]);

  const typeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    records.forEach((record) => {
      if (record.type) {
        uniqueTypes.add(record.type);
      }
    });
    const sorted = Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b));
    return [
      { value: "all" as TypeFilter, label: t("shops.filters.allTypes") },
      ...sorted.map((value) => ({
        value,
        label: getTypeLabel(value, t),
      })),
    ];
  }, [records, t]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = normalize(searchTerm);
    return records.filter((record) => {
      if (typeFilter !== "all") {
        const typeValue = record.type ? record.type.toString() : "";
        if (typeValue !== typeFilter) {
          return false;
        }
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = `${record.name ?? ""} ${record.notes ?? ""} ${record.type ?? ""}`;
      return normalize(haystack).includes(normalizedSearch);
    });
  }, [records, searchTerm, typeFilter]);

  useEffect(() => {
    if (!filteredRecords.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !filteredRecords.some((record) => record.id === activeId)) {
      setActiveId(filteredRecords[0].id);
    }
  }, [activeId, filteredRecords]);

  const activeRecord = useMemo(() => {
    if (!activeId) {
      return null;
    }
    return filteredRecords.find((record) => record.id === activeId) ?? null;
  }, [activeId, filteredRecords]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const handleOpenModal = useCallback(() => {
    setAddModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const handleCreateShop = useCallback((values: { name: string; type?: string; notes?: string | null }) => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const newRecord: ShopRecord = {
      id,
      name: values.name,
      type: values.type ? values.type.trim().toLowerCase() : null,
      image_url: null,
      notes: values.notes ?? null,
      created_at: new Date().toISOString(),
    };

    setRecords((prev) => [newRecord, ...prev]);
    setActiveId(id);
    setAddModalOpen(false);
    showSuccess(t("shops.actions.addNew"));
  }, [showSuccess, t]);

  const handleNavigateToTransactions = useCallback(() => {
    const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/transactions";
    navigate(destination);
    setAddModalOpen(false);
  }, [navigate, returnTo]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">{t("shops.title")}</h2>
          <p className="text-sm text-gray-600">{t("shops.description")}</p>
          <p className="text-xs text-gray-500">{t("shops.summary.count", { count: filteredRecords.length })}</p>
          {errorMessage ? <p className="text-xs text-red-600">{errorMessage}</p> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-gray-600">
            <span>{t("shops.filters.typeLabel")}</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            {t("shops.actions.addNew")}
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("shops.filters.searchPlaceholder")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-500 transition hover:border-gray-200 hover:bg-gray-50"
                aria-label={t("common.clear")}
              >
                <ClearIcon />
              </button>
            ) : null}
          </div>

          <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {filteredRecords.map((shop) => {
              const isActive = activeId === shop.id;
              const typeLabel = getTypeLabel(shop.type ?? null, t);
              return (
                <li key={shop.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(shop.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      isActive ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {shop.image_url ? (
                      <RemoteImage
                        src={shop.image_url}
                        alt={shop.name}
                        className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {buildInitials(shop.name)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{shop.name}</p>
                      <p className="truncate text-xs text-gray-500">{typeLabel}</p>
                    </div>
                    <Tooltip label={formatCreatedAt(shop.created_at ?? null)}>
                      <span className="text-xs text-gray-500">{formatCreatedAt(shop.created_at ?? null)}</span>
                    </Tooltip>
                  </button>
                </li>
              );
            })}
            {filteredRecords.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">{t("shops.empty")}</li>
            ) : null}
          </ul>
        </div>

        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6">
          {activeRecord ? (
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center gap-4">
                {activeRecord.image_url ? (
                  <RemoteImage
                    src={activeRecord.image_url}
                    alt={activeRecord.name}
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-base font-semibold text-indigo-700">
                    {buildInitials(activeRecord.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-gray-900">{activeRecord.name}</h3>
                  <p className="truncate text-sm text-gray-500">{getTypeLabel(activeRecord.type ?? null, t)}</p>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="font-medium text-gray-500">{t("shops.fields.type")}</dt>
                  <dd>{getTypeLabel(activeRecord.type ?? null, t)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="font-medium text-gray-500">{t("shops.fields.created")}</dt>
                  <dd>{formatCreatedAt(activeRecord.created_at ?? null)}</dd>
                </div>
                {activeRecord.notes ? (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-500">{t("common.notes")}</dt>
                    <dd className="whitespace-pre-wrap text-gray-700">{activeRecord.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("shops.empty")}</p>
          )}
        </div>
      </div>

      <AddShopModal
        open={isAddModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateShop}
        onNavigateToTransactions={handleNavigateToTransactions}
      />
    </div>
  );
}

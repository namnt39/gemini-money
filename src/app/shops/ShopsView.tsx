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
};

type TypeFilter = "all" | string;

type ShopRecord = Shop & { notes?: string | null };

const formatCreatedAt = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function ShopsView({ shops, errorMessage }: ShopsViewProps) {
  const { navigate, locale } = useAppShell();
  const t = useMemo(() => createTranslator(locale), [locale]);

  const [records, setRecords] = useState<ShopRecord[]>(() => shops ?? []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAddModalOpen, setAddModalOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  // merge props.shops -> local cache (avoid duplicates)
  useEffect(() => {
    setRecords((prev) => {
      const seen = new Set(prev.map((s) => s.id));
      const merged = [...prev];
      for (const s of shops) {
        if (!seen.has(s.id)) merged.push(s);
      }
      return merged;
    });
  }, [shops]);

  const typeOptions = useMemo(() => {
    const all = new Set<string>();
    for (const s of records) if (s.type) all.add(String(s.type));
    return [{ value: "all", label: t("shops.filters.allTypes") }].concat(
      Array.from(all)
        .sort()
        .map((x) => ({
          value: x,
          label: isTranslationKey(x) ? t(x as any) : x,
        }))
    );
  }, [records, t]);

  const normalized = (s: string) => s.normalize("NFKC").toLowerCase().trim();

  const filtered = useMemo(() => {
    const term = normalized(search);
    return records.filter((s) => {
      if (filter !== "all" && String(s.type ?? "") !== filter) return false;
      if (!term) return true;
      const hay = `${s.name ?? ""} ${s.notes ?? ""} ${s.type ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [records, search, filter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !filtered.some((s) => s.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const handleSearchClear = useCallback(() => {
    setSearch("");
    searchRef.current?.focus();
  }, []);

  const handleOpenAddModal = useCallback(() => setAddModalOpen(true), []);
  const handleCloseAddModal = useCallback(() => setAddModalOpen(false), []);

  const handleCreateShop = useCallback(
    (values: { name: string; type?: string; notes?: string | null }) => {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const record: ShopRecord = {
        id,
        name: values.name,
        type: values.type ? values.type.toLowerCase() : null,
        image_url: null,
        notes: values.notes ?? null,
        created_at: new Date().toISOString(),
      } as any;

      setRecords((prev) => [record, ...prev]);
      setActiveId(id);
      setAddModalOpen(false);
    },
    []
  );

  const handleNavigateToTransactions = useCallback(() => {
    navigate("/transactions");
    setAddModalOpen(false);
  }, [navigate]);

  const active = useMemo(
    () => filtered.find((s) => s.id === activeId) ?? null,
    [filtered, activeId]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900">
            {t("shops.title")}
          </h1>
          <p className="text-sm text-gray-600">
            {t("shops.subtitle", { count: records.length })}
          </p>
          {errorMessage ? (
            <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <label htmlFor="shop-type-filter">{t("shops.filters.typeLabel")}</label>
            <select
              id="shop-type-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            {t("shops.actions.add")}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 grid-rows-1 gap-4 md:grid-cols-12">
        {/* List */}
        <div className="flex flex-col gap-3 md:col-span-5">
          <div className="relative">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder={t("shops.search.placeholder")}
            />
            {search ? (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100"
              >
                <ClearIcon className="h-4 w-4 text-gray-500" />
              </button>
            ) : null}
          </div>

          <ul className="divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200">
            {filtered.map((s) => {
              const isActive = s.id === activeId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={[
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                      isActive ? "bg-indigo-50" : "hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <RemoteImage
                      src={s.image_url ?? ""}
                      alt={s.name}
                      className="h-8 w-8 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {s.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {s.type || "-"}
                      </p>
                    </div>
                    <Tooltip content={formatCreatedAt(s.created_at ?? null)}>
                      <span className="whitespace-nowrap text-xs text-gray-500">
                        {formatCreatedAt(s.created_at ?? null)}
                      </span>
                    </Tooltip>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">
                {t("shops.empty")}
              </li>
            ) : null}
          </ul>
        </div>

        {/* Detail */}
        <div className="md:col-span-7">
          {active ? (
            <div className="rounded-md border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <RemoteImage
                  src={active.image_url ?? ""}
                  alt={active.name}
                  className="h-10 w-10 rounded-md object-cover"
                />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {active.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {active.type || "-"}
                  </p>
                </div>
              </div>
              {active.notes ? (
                <p className="mt-3 text-sm text-gray-700">{active.notes}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
              {t("shops.noSelection")}
            </div>
          )}
        </div>
      </div>

      {/* Centralized Add Shop modal */}
      <AddShopModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onCreate={handleCreateShop}
        onNavigateToTransactions={handleNavigateToTransactions}
      />
    </div>
  );
}

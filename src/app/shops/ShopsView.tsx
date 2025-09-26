"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Tooltip from "@/components/Tooltip";
import RemoteImage from "@/components/RemoteImage";
import { ClearIcon } from "@/components/Icons";
import { createTranslator, isTranslationKey } from "@/lib/i18n";
import { useAppShell } from "@/components/AppShellProvider";

import type { Shop } from "../transactions/add/formData";

type ShopsViewProps = {
  shops: Shop[];
  errorMessage?: string;
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

const normalizeType = (value: string | null | undefined) => {
  if (!value) {
    return "other";
  }
  return value.toLowerCase();
};

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function ShopsView({ shops, errorMessage }: ShopsViewProps) {
  const t = createTranslator();
  const { navigate } = useAppShell();
  const [shopRecords, setShopRecords] = useState<ShopRecord[]>(() => shops.map((shop) => ({ ...shop })));
  const [selectedShopId, setSelectedShopId] = useState<string | null>(shops[0]?.id ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setShopRecords(shops.map((shop) => ({ ...shop })));
    setSelectedShopId((prev) => {
      if (prev && shops.some((shop) => shop.id === prev)) {
        return prev;
      }
      return shops[0]?.id ?? null;
    });
  }, [shops]);

  const availableTypes = useMemo(() => {
    const unique = new Set<string>();
    shopRecords.forEach((shop) => {
      if (shop.type) {
        unique.add(normalizeType(shop.type));
      }
    });
    return Array.from(unique).sort();
  }, [shopRecords]);

  const filteredShops = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return shopRecords.filter((shop) => {
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
  }, [shopRecords, searchTerm, typeFilter]);

  useEffect(() => {
    if (filteredShops.length === 0) {
      setSelectedShopId(null);
      return;
    }
    if (!selectedShopId || !filteredShops.some((shop) => shop.id === selectedShopId)) {
      setSelectedShopId(filteredShops[0].id);
    }
  }, [filteredShops, selectedShopId]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

  const selectedShop = useMemo(
    () => filteredShops.find((shop) => shop.id === selectedShopId) ?? null,
    [filteredShops, selectedShopId]
  );

  const summaryLabel = useMemo(() => t("shops.summary.count", { count: filteredShops.length }), [filteredShops.length, t]);

  const handleDeleteShop = useCallback((shop: ShopRecord) => {
    const shouldDelete = confirm(`Delete ${shop.name}?`);
    if (!shouldDelete) {
      return;
    }
    setShopRecords((prev) => prev.filter((item) => item.id !== shop.id));
  }, []);

  const handleEditShop = useCallback((shop: ShopRecord) => {
    alert(`Editing ${shop.name} is coming soon.`);
  }, []);

  const handleNavigateToTransactions = useCallback(() => {
    navigate("/transactions");
    setAddModalOpen(false);
  }, [navigate]);

  const generateShopId = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const handleCreateShop = useCallback(
    (values: { name: string; type?: string; notes?: string | null }) => {
      const id = generateShopId();
      const record: ShopRecord = {
        id,
        name: values.name,
        type: values.type ? values.type.toLowerCase() : null,
        image_url: null,
        created_at: new Date().toISOString(),
        notes: values.notes ?? null,
      };
      setShopRecords((prev) => [record, ...prev]);
      setSelectedShopId(id);
      setAddModalOpen(false);
      setSearchTerm("");
      setTypeFilter("all");
    },
    [generateShopId]
  );

  const handleViewShop = useCallback((shop: ShopRecord) => {
    setSelectedShopId(shop.id);
  }, []);

  const formatTypeLabel = useCallback(
    (type: string) => {
      const key = `shops.types.${type}`;
      if (isTranslationKey(key)) {
        const translation = t(key);
        if (translation !== key) {
          return translation;
        }
      }
      return type.charAt(0).toUpperCase() + type.slice(1);
    },
    [t]
  );

  const selectedShopDetails = useMemo(() => {
    if (!selectedShop) {
      return null;
    }
    const detailType = formatTypeLabel(normalizeType(selectedShop.type));
    return {
      detailType,
      initials: getInitials(selectedShop.name),
    };
  }, [formatTypeLabel, selectedShop]);

  const typeOptions = useMemo(() => {
    const base: { label: string; value: TypeFilter }[] = [
      { value: "all", label: t("shops.filters.allTypes") },
    ];
    const mapped = availableTypes.map((type) => {
      return { value: type, label: formatTypeLabel(type) };
    });
    return [...base, ...mapped];
  }, [availableTypes, formatTypeLabel, t]);

  const addShopLabel = useMemo(() => {
    const label = t("shops.actions.addNew");
    return label === "shops.actions.addNew" ? "Add new shop" : label;
  }, [t]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {errorMessage ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{errorMessage}</div>
        ) : null}
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>{t("shops.filters.typeLabel")}</span>
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
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                {addShopLabel}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6 px-4 py-4 lg:flex-row">
          <aside className="flex w-full flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:w-80">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shop details</h3>
            </div>
            {selectedShop && selectedShopDetails ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-white">
                    {selectedShop.image_url ? (
                      <RemoteImage
                        src={selectedShop.image_url}
                        alt={selectedShop.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                        {selectedShopDetails.initials || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">{selectedShop.name}</p>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{selectedShopDetails.detailType}</p>
                  </div>
                </div>
                <dl className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-gray-500">{t("shops.fields.type")}</dt>
                    <dd>{selectedShopDetails.detailType}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-medium text-gray-500">{t("shops.fields.created")}</dt>
                    <dd>{formatCreatedAt(selectedShop.created_at ?? null)}</dd>
                  </div>
                  {selectedShop.notes ? (
                    <div className="flex flex-col gap-1">
                      <dt className="font-medium text-gray-500">Notes</dt>
                      <dd className="whitespace-pre-wrap text-gray-700">{selectedShop.notes}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditShop(selectedShop)}
                    className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteShop(selectedShop)}
                    className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleNavigateToTransactions}
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    Transactions
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a shop to view details.</p>
            )}
          </aside>
          <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
              <span>{summaryLabel}</span>
            </div>
            <div className="p-4">
              {filteredShops.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">{t("shops.empty")}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredShops.map((shop) => {
                    const typeKey = normalizeType(shop.type);
                    const displayType = formatTypeLabel(typeKey);
                    const initials = getInitials(shop.name);
                    const isActive = shop.id === selectedShopId;
                    return (
                      <div
                        key={shop.id}
                        className={`flex flex-col gap-4 rounded-lg border px-4 py-4 shadow-sm transition ${
                          isActive
                            ? "border-indigo-300 bg-indigo-50/60"
                            : "border-gray-200 bg-white hover:border-indigo-200 hover:shadow"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-12 w-12 overflow-hidden rounded-full border ${
                                isActive ? "border-indigo-200" : "border-gray-200"
                              } bg-gray-100`}
                            >
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
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{shop.name}</p>
                              <p className="text-xs uppercase tracking-wide text-gray-500">{displayType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleViewShop(shop)}
                              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditShop(shop)}
                              className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShop(shop)}
                              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <dl className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center justify-between">
                            <dt className="font-medium text-gray-500">{t("shops.fields.type")}</dt>
                            <dd>{displayType}</dd>
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
      </div>
      {isAddModalOpen ? (
        <AddShopModal
          onClose={() => setAddModalOpen(false)}
          onCreate={handleCreateShop}
          onNavigate={handleNavigateToTransactions}
        />
      ) : null}
    </div>
  );
}

type AddShopModalProps = {
  onClose: () => void;
  onCreate: (values: { name: string; type?: string; notes?: string | null }) => void;
  onNavigate: () => void;
};

function AddShopModal({ onClose, onCreate, onNavigate }: AddShopModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      onCreate({
        name: trimmedName,
        type: type.trim() || undefined,
        notes: notes.trim() ? notes.trim() : null,
      });
      setName("");
      setType("");
      setNotes("");
    },
    [name, notes, onCreate, type]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Add new shop</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-name-input">
              Name
            </label>
            <input
              id="shop-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Enter shop name"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-type-input">
              Type
            </label>
            <input
              id="shop-type-input"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g. ecommerce, bank"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-notes-input">
              Notes
            </label>
            <textarea
              id="shop-notes-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Additional details"
            />
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Create shop
            </button>
            <button
              type="button"
              onClick={onNavigate}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              Go to transactions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

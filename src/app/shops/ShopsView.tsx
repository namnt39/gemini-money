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

export default function ShopsView({ shops, errorMessage, returnTo, shouldOpenModal = false }: ShopsViewProps) {
  const t = createTranslator();
  const { navigate } = useAppShell();
  const [shopRecords, setShopRecords] = useState<ShopRecord[]>(() => shops.map((shop) => ({ ...shop })));
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [isAddModalOpen, setAddModalOpen] = useState(shouldOpenModal);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setShopRecords(shops.map((shop) => ({ ...shop })));
  }, [shops]);

  useEffect(() => {
    if (shouldOpenModal) {
      setAddModalOpen(true);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("openModal");
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [shouldOpenModal]);

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
      const normalizedType = normalizeType(shop.type);
      const matchesType =
        typeFilter === "all" || normalizedType === typeFilter || (typeFilter === "other" && !shop.type);
      if (!matchesType) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return shop.name.toLowerCase().includes(normalizedSearch);
    });
  }, [shopRecords, searchTerm, typeFilter]);

  const handleSearchClear = useCallback(() => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  }, []);

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

  const generateShopId = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const handleCreateShop = useCallback(
    (values: { name: string; type?: string; notes?: string | null; imageUrl?: string | null }) => {
      const id = generateShopId();
      const record: ShopRecord = {
        id,
        name: values.name,
        type: values.type ? values.type.toLowerCase() : null,
        image_url: values.imageUrl ? values.imageUrl : null,
        created_at: new Date().toISOString(),
        notes: values.notes ?? null,
      };
      setShopRecords((prev) => [record, ...prev]);
      setAddModalOpen(false);
      setSearchTerm("");
      setTypeFilter("all");
    },
    [generateShopId]
  );

  const handleModalBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    setAddModalOpen(false);
  }, [navigate, returnTo]);

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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                {addShopLabel}
              </button>
              <span className="text-sm text-gray-600">{summaryLabel}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
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
              <div className="w-full sm:max-w-xs">
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
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("shops.tableHeaders.icon")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("shops.tableHeaders.name")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("shops.tableHeaders.type")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">{t("shops.tableHeaders.created")}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredShops.map((shop) => {
              const typeKey = normalizeType(shop.type);
              const displayType = formatTypeLabel(typeKey);
              const initials = getInitials(shop.name);

              return (
                <tr key={shop.id} className="border-b border-gray-200">
                  <td className="px-4 py-3">
                    {shop.image_url ? (
                      <RemoteImage
                        src={shop.image_url}
                        alt={shop.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold uppercase text-gray-600">
                        {initials}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{shop.name}</td>
                  <td className="px-4 py-3 text-gray-600">{displayType}</td>
                  <td className="px-4 py-3 text-gray-600">{formatCreatedAt(shop.created_at ?? null)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditShop(shop)}
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShop(shop)}
                        className="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredShops.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {searchTerm.trim() ? t("shops.empty") : t("common.noData")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {isAddModalOpen ? (
        <AddShopModal
          onClose={() => setAddModalOpen(false)}
          onCreate={handleCreateShop}
          onBack={handleModalBack}
          availableTypes={availableTypes}
          formatTypeLabel={formatTypeLabel}
        />
      ) : null}
    </div>
  );
}

type AddShopModalProps = {
  onClose: () => void;
  onCreate: (values: { name: string; type?: string; notes?: string | null; imageUrl?: string | null }) => void;
  onBack: () => void;
  availableTypes: string[];
  formatTypeLabel: (type: string) => string;
};

function AddShopModal({ onClose, onCreate, onBack, availableTypes, formatTypeLabel }: AddShopModalProps) {
  const t = createTranslator();
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isAddingType, setIsAddingType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState("");
  const [customTypes, setCustomTypes] = useState<string[]>([]);

  const mergedTypes = useMemo(() => {
    const result = new Set<string>();
    availableTypes.forEach((type) => {
      if (type) {
        result.add(type);
      }
    });
    customTypes.forEach((type) => {
      if (type) {
        result.add(type);
      }
    });
    return Array.from(result).sort();
  }, [availableTypes, customTypes]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      const trimmedNotes = notes.trim();
      const trimmedImage = imageUrl.trim();
      onCreate({
        name: trimmedName,
        type: selectedType ?? undefined,
        notes: trimmedNotes ? trimmedNotes : null,
        imageUrl: trimmedImage ? trimmedImage : null,
      });
      setName("");
      setSelectedType(null);
      setNotes("");
      setImageUrl("");
      setCustomTypeInput("");
      setCustomTypes([]);
      setIsAddingType(false);
    },
    [imageUrl, name, notes, onCreate, selectedType]
  );

  const handleAddCustomType = useCallback(() => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) {
      return;
    }
    const normalized = trimmed.toLowerCase();
    setCustomTypes((prev) => {
      if (prev.includes(normalized) || availableTypes.includes(normalized)) {
        return prev;
      }
      return [...prev, normalized];
    });
    setSelectedType(normalized);
    setCustomTypeInput("");
    setIsAddingType(false);
  }, [availableTypes, customTypeInput]);

  const handleCancelCustomType = useCallback(() => {
    setCustomTypeInput("");
    setIsAddingType(false);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t("shops.modal.addTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-name-input">
              {t("shops.fields.name")}
            </label>
            <input
              id="shop-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("shops.modal.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">{t("shops.fields.type")}</span>
            <div className="flex flex-wrap gap-2">
              {mergedTypes.map((type) => {
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow"
                        : "border border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                    }`}
                    aria-pressed={isActive}
                  >
                    {formatTypeLabel(type)}
                  </button>
                );
              })}
              {isAddingType ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={customTypeInput}
                    onChange={(event) => setCustomTypeInput(event.target.value)}
                    placeholder={t("shops.typePicker.placeholder")}
                    className="w-40 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomType}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    >
                      {t("shops.typePicker.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelCustomType}
                      className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingType(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-indigo-300 text-xl font-semibold text-indigo-600 transition hover:border-indigo-400 hover:text-indigo-700"
                  aria-label={t("shops.typePicker.addLabel")}
                >
                  +
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-image-input">
              {t("shops.fields.imageUrl")}
            </label>
            <input
              id="shop-image-input"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("shops.modal.imagePlaceholder")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="shop-notes-input">
              {t("common.notes")}
            </label>
            <textarea
              id="shop-notes-input"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder={t("shops.modal.notesPlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
            >
              {t("common.back")}
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              {t("shops.modal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

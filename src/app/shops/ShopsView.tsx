diff --git a/src/app/shops/ShopsView.tsx b/src/app/shops/ShopsView.tsx
index 1cdbd3ff766a14472123d3fa4f75d5829dfe1964..9d3171cbfe88306f28854aa75d8ac577e7231bea 100644
--- a/src/app/shops/ShopsView.tsx
+++ b/src/app/shops/ShopsView.tsx
@@ -1,34 +1,35 @@
 "use client";
 
-import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
+import { useCallback, useEffect, useMemo, useRef, useState } from "react";
 
 import Tooltip from "@/components/Tooltip";
 import RemoteImage from "@/components/RemoteImage";
 import { ClearIcon } from "@/components/Icons";
 import { createTranslator, isTranslationKey } from "@/lib/i18n";
 import { useAppShell } from "@/components/AppShellProvider";
+import AddShopModal from "@/components/shops/AddShopModal";
 
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
diff --git a/src/app/shops/ShopsView.tsx b/src/app/shops/ShopsView.tsx
index 1cdbd3ff766a14472123d3fa4f75d5829dfe1964..9d3171cbfe88306f28854aa75d8ac577e7231bea 100644
--- a/src/app/shops/ShopsView.tsx
+++ b/src/app/shops/ShopsView.tsx
@@ -413,140 +414,34 @@ export default function ShopsView({ shops, errorMessage }: ShopsViewProps) {
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
-      {isAddModalOpen ? (
-        <AddShopModal
-          onClose={() => setAddModalOpen(false)}
-          onCreate={handleCreateShop}
-          onNavigate={handleNavigateToTransactions}
-        />
-      ) : null}
-    </div>
-  );
-}
-
-type AddShopModalProps = {
-  onClose: () => void;
-  onCreate: (values: { name: string; type?: string; notes?: string | null }) => void;
-  onNavigate: () => void;
-};
-
-function AddShopModal({ onClose, onCreate, onNavigate }: AddShopModalProps) {
-  const [name, setName] = useState("");
-  const [type, setType] = useState("");
-  const [notes, setNotes] = useState("");
-
-  const handleSubmit = useCallback(
-    (event: FormEvent<HTMLFormElement>) => {
-      event.preventDefault();
-      const trimmedName = name.trim();
-      if (!trimmedName) {
-        return;
-      }
-      onCreate({
-        name: trimmedName,
-        type: type.trim() || undefined,
-        notes: notes.trim() ? notes.trim() : null,
-      });
-      setName("");
-      setType("");
-      setNotes("");
-    },
-    [name, notes, onCreate, type]
-  );
-
-  return (
-    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
-      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
-      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
-        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
-          <h2 className="text-lg font-semibold text-gray-900">Add new shop</h2>
-          <button
-            type="button"
-            onClick={onClose}
-            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
-            aria-label="Close"
-          >
-            ×
-          </button>
-        </div>
-        <form onSubmit={handleSubmit} className="space-y-4 p-6">
-          <div className="space-y-1">
-            <label className="text-sm font-medium text-gray-700" htmlFor="shop-name-input">
-              Name
-            </label>
-            <input
-              id="shop-name-input"
-              value={name}
-              onChange={(event) => setName(event.target.value)}
-              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
-              placeholder="Enter shop name"
-              required
-            />
-          </div>
-          <div className="space-y-1">
-            <label className="text-sm font-medium text-gray-700" htmlFor="shop-type-input">
-              Type
-            </label>
-            <input
-              id="shop-type-input"
-              value={type}
-              onChange={(event) => setType(event.target.value)}
-              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
-              placeholder="e.g. ecommerce, bank"
-            />
-          </div>
-          <div className="space-y-1">
-            <label className="text-sm font-medium text-gray-700" htmlFor="shop-notes-input">
-              Notes
-            </label>
-            <textarea
-              id="shop-notes-input"
-              value={notes}
-              onChange={(event) => setNotes(event.target.value)}
-              rows={3}
-              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
-              placeholder="Additional details"
-            />
-          </div>
-          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
-            <button
-              type="submit"
-              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
-            >
-              Create shop
-            </button>
-            <button
-              type="button"
-              onClick={onNavigate}
-              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100"
-            >
-              Go to transactions
-            </button>
-          </div>
-        </form>
-      </div>
+      <AddShopModal
+        open={isAddModalOpen}
+        onClose={() => setAddModalOpen(false)}
+        onCreate={handleCreateShop}
+        onNavigateToTransactions={handleNavigateToTransactions}
+      />
     </div>
   );
 }

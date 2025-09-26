import { createTranslator } from "@/lib/i18n";
import { loadShops } from "../transactions/add/formData";
import ShopsView from "./ShopsView";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const t = createTranslator();
  const { shops, errorMessage } = await loadShops();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-800">{t("shops.title")}</h1>
        <p className="text-sm text-gray-500">{t("shops.description")}</p>
      </div>
      <ShopsView shops={shops} errorMessage={errorMessage} />
    </div>
  );
}

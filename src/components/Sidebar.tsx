import Link from "next/link";

import { createTranslator } from "@/lib/i18n";

export default function Sidebar() {
  const t = createTranslator();

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 p-4 text-white">
      <h2 className="text-2xl font-bold mb-8">{t("common.appName")}</h2>
      <nav>
        <ul>
          <li className="mb-4">
            <Link href="/" className="block p-2 rounded hover:bg-gray-700">
              {t("sidebar.dashboard")}
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/transactions" className="block p-2 rounded hover:bg-gray-700">
              {t("sidebar.transactions")}
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/categories" className="block p-2 rounded hover:bg-gray-700">
              {t("sidebar.categories")}
            </Link>
          </li>
          <li className="mb-4">
            <a href="#" className="block p-2 rounded hover:bg-gray-700">
              {t("sidebar.reports")}
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
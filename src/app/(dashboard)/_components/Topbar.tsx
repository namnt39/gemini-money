"use client";

import { createTranslator } from "@/lib/i18n";

type TopbarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const SidebarToggleIcon = ({ collapsed }: { collapsed: boolean }) => {
  if (collapsed) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h10M4 18h16" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M19 6H5M19 12H5M12 18H5" strokeLinecap="round" />
      <path d="M15 9l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function Topbar({ collapsed, onToggle }: TopbarProps) {
  const t = createTranslator();
  const ariaLabel = collapsed ? t("common.showSidebar") : t("common.hideSidebar");

  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
            collapsed
              ? "border-indigo-500 bg-indigo-600 text-white shadow"
              : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          }`}
          aria-pressed={collapsed}
          aria-label={ariaLabel}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
        <div>
          <p className="text-lg font-semibold text-gray-900">{t("common.appName")}</p>
          <p className="text-xs text-gray-500">{t("dashboard.title")}</p>
        </div>
      </div>
    </header>
  );
}

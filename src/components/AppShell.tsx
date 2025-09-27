"use client";

import { useCallback, useState } from "react";

import AppShellProvider from "./AppShellProvider";
import Sidebar from "./Sidebar";
import { createTranslator } from "@/lib/i18n";

const MenuIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    className="h-5 w-5"
  >
    <path
      d="M4 7h16M4 12h16M4 17h16"
      className={open ? "opacity-40" : "opacity-100"}
      strokeLinecap="round"
    />
  </svg>
);

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const t = createTranslator();
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, []);

  return (
    <AppShellProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  sidebarCollapsed
                    ? "border-indigo-500 bg-indigo-600 text-white shadow"
                    : "border-gray-300 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
                aria-pressed={sidebarCollapsed}
                aria-label={t("common.toggleSidebar")}
              >
                <MenuIcon open={sidebarCollapsed} />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </AppShellProvider>
  );
}

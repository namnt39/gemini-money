"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppShell } from "./AppShellProvider";
import { createTranslator } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: "sidebar.dashboard" | "sidebar.transactions" | "sidebar.categories" | "sidebar.reports";
  disabled?: boolean;
  matchExact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", labelKey: "sidebar.dashboard", matchExact: true },
  { href: "/transactions", labelKey: "sidebar.transactions" },
  { href: "/categories", labelKey: "sidebar.categories" },
  { href: "/reports", labelKey: "sidebar.reports", disabled: true },
];

const getInitials = (label: string) => {
  const parts = label.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  const [first, second] = parts;
  if (!second) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
};

export default function Sidebar() {
  const t = createTranslator();
  const pathname = usePathname();
  const { navigate } = useAppShell();

  const activeMap = useMemo(() => {
    return navItems.reduce<Record<string, boolean>>((acc, item) => {
      const isActive = item.matchExact ? pathname === item.href : pathname.startsWith(item.href);
      acc[item.href] = isActive;
      return acc;
    }, {});
  }, [pathname]);

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-900 text-white">
      <div className="px-6 py-8">
        <h2 className="text-2xl font-bold tracking-tight">{t("common.appName")}</h2>
      </div>
      <nav>
        <ul className="space-y-1 px-4 pb-6">
          {navItems.map((item) => {
            const isActive = activeMap[item.href] ?? false;
            const label = t(item.labelKey);
            const content = (
              <span className="flex items-center justify-between gap-3">
                <span className="flex-1 text-left">{label}</span>
                {isActive ? (
                  <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                ) : null}
              </span>
            );

            const baseClasses =
              "relative block rounded-md px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";
            const activeClasses = isActive
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-gray-200 hover:bg-gray-800 hover:text-white";

            if (item.disabled) {
              return (
                <li key={item.href}>
                  <span className={`${baseClasses} cursor-not-allowed opacity-60`}>
                    {content}
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-gray-400">
                      {getInitials(label)}
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(item.href);
                  }}
                  className={`${baseClasses} ${activeClasses}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

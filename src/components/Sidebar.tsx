"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAppShell } from "./AppShellProvider";
import { createTranslator } from "@/lib/i18n";
import Tooltip from "@/components/Tooltip";

type NavItem = {
  href: string;
  labelKey:
    | "sidebar.dashboard"
    | "sidebar.accounts"
    | "sidebar.shops"
    | "sidebar.transactions"
    | "sidebar.categories"
    | "sidebar.people"
    | "sidebar.reports";
  disabled?: boolean;
  matchExact?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", labelKey: "sidebar.dashboard", matchExact: true },
  { href: "/accounts", labelKey: "sidebar.accounts" },
  { href: "/shops", labelKey: "sidebar.shops" },
  { href: "/transactions", labelKey: "sidebar.transactions" },
  { href: "/categories", labelKey: "sidebar.categories" },
  { href: "/people", labelKey: "sidebar.people" },
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

type SidebarProps = {
  collapsed: boolean;
};

export default function Sidebar({ collapsed }: SidebarProps) {
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

  const logoContainerClasses = collapsed ? "px-4 py-6" : "px-6 py-8";
  const navListClasses = collapsed ? "space-y-2 px-2 pb-6" : "space-y-1 px-4 pb-6";

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col border-r border-gray-200 bg-gray-900 text-white transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-20" : "w-64"
      }`}
      aria-label={t("common.appName")}
    >
      <div className={`${logoContainerClasses} transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-white shadow-lg shadow-emerald-500/40">
            ₫
          </span>
          {!collapsed ? (
            <h2 className="text-2xl font-bold tracking-tight">{t("common.appName")}</h2>
          ) : null}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className={`${navListClasses} transition-all duration-300`}>
          {navItems.map((item) => {
            const isActive = activeMap[item.href] ?? false;
            const label = t(item.labelKey);
            const initials = getInitials(label) || label.charAt(0)?.toUpperCase() || "?";

            const baseClasses = collapsed
              ? "relative flex h-12 w-12 items-center justify-center rounded-md text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              : "relative block rounded-md px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";
            const activeClasses = isActive
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
              : "text-gray-200 hover:bg-gray-800 hover:text-white";

            const indicator = isActive ? (
              <span
                className={`absolute ${collapsed ? "-top-1 right-0 h-2 w-2" : "right-4 top-1/2 h-2 w-2 -translate-y-1/2"} rounded-full bg-emerald-400`}
                aria-hidden="true"
              />
            ) : null;

            if (item.disabled) {
              const disabledClasses = `${baseClasses} cursor-not-allowed opacity-60`;
              const content = collapsed ? (
                <span className={disabledClasses} aria-label={label}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-800/60 text-xs uppercase tracking-wide text-gray-300">
                    {initials}
                  </span>
                  {indicator}
                </span>
              ) : (
                <span className={disabledClasses}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex-1 text-left">{label}</span>
                    {indicator}
                  </span>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-gray-400">
                    {initials}
                  </span>
                </span>
              );

              return (
                <li key={item.href} className={collapsed ? "flex justify-center" : undefined}>
                  {collapsed ? <Tooltip label={label}>{content}</Tooltip> : content}
                </li>
              );
            }

            const link = (
              <Link
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.href);
                }}
                className={`${baseClasses} ${activeClasses}`}
                aria-current={isActive ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
              >
                {collapsed ? (
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-800/70 text-xs font-semibold uppercase tracking-wide">
                    {initials}
                  </span>
                ) : (
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex-1 text-left">{label}</span>
                    {indicator}
                  </span>
                )}
                {!collapsed ? null : indicator}
              </Link>
            );

            return (
              <li key={item.href} className={collapsed ? "flex justify-center" : undefined}>
                {collapsed ? <Tooltip label={label}>{link}</Tooltip> : link}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

"use client";

import { useCallback, useState } from "react";

import AppShellProvider from "./AppShellProvider";
import Sidebar from "./Sidebar";
import Topbar from "@/app/(dashboard)/_components/Topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => !previous);
  }, []);

  return (
    <AppShellProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </AppShellProvider>
  );
}

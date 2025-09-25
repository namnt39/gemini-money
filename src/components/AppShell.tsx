"use client";

import AppShellProvider from "./AppShellProvider";
import Sidebar from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <AppShellProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="relative flex-1 overflow-auto p-8">{children}</main>
      </div>
    </AppShellProvider>
  );
}

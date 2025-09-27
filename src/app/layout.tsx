import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell"; // Import AppShell

export const metadata: Metadata = {
  title: "Money Flow",
  description: "Money Flow personal finance management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
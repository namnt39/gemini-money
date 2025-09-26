import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell"; // Import AppShell

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-gray-50`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
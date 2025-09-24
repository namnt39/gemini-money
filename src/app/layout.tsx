import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // Import Sidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gemini",
  description: "Personal Finance Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
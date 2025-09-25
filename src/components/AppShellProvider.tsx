"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createTranslator } from "@/lib/i18n";

type AppShellContextValue = {
  navigate: (href: string) => void;
  isNavigating: boolean;
  showSuccess: (message: string) => void;
};

const AppShellContext = createContext<AppShellContextValue | undefined>(undefined);

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShellProvider");
  }
  return context;
}

type ToastState = {
  id: number;
  message: string;
};

type AppShellProviderProps = {
  children: React.ReactNode;
};

export default function AppShellProvider({ children }: AppShellProviderProps) {
  const t = createTranslator();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const hideToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!isPending) {
      setIsNavigating(false);
    }
  }, [isPending]);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (hideToastTimeoutRef.current) {
        clearTimeout(hideToastTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (!href || href === pathname) {
        return;
      }
      setIsNavigating(true);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, startTransition]
  );

  const showSuccess = useCallback((message: string) => {
    if (hideToastTimeoutRef.current) {
      clearTimeout(hideToastTimeoutRef.current);
    }
    const id = Date.now();
    setToast({ id, message });
    hideToastTimeoutRef.current = setTimeout(() => {
      setToast((current) => {
        if (current && current.id === id) {
          return null;
        }
        return current;
      });
    }, 2400);
  }, []);

  const contextValue = useMemo<AppShellContextValue>(
    () => ({ navigate, isNavigating, showSuccess }),
    [isNavigating, navigate, showSuccess]
  );

  return (
    <AppShellContext.Provider value={contextValue}>
      {children}
      {isNavigating ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-gray-900/25 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            {t("common.loadingApp")}
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-2">
          <div className="toast-pop flex items-center gap-3 rounded-lg bg-gray-900/90 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/90">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="checkmark-svg text-white">
                <circle cx="10" cy="10" r="9" className="checkmark-circle" strokeOpacity="0.2" />
                <path d="M6 10.5L8.75 13 14 7" className="checkmark-path" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="leading-snug">{toast.message}</span>
          </div>
        </div>
      ) : null}
    </AppShellContext.Provider>
  );
}

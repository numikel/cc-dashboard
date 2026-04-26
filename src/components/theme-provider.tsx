"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "cc-dashboard-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function applyTheme(mode: ThemeMode, systemTheme = getSystemTheme()): ResolvedTheme {
  const resolved = mode === "system" ? systemTheme : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe initial state — both server and first client render see "system" / "light".
  // Stored mode and the actual system preference are loaded after hydration in the
  // effect below to avoid a hydration mismatch under React 19 strict mode.
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const resolvedTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    // Hydration step: read storage and matchMedia after mount so SSR and the
    // first client render agree. Cascading re-render is intentional here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModeState(getStoredMode());
    setSystemTheme(getSystemTheme());
  }, []);

  useEffect(() => {
    applyTheme(mode, systemTheme);
  }, [mode, systemTheme]);

  useEffect(() => {
    if (mode !== "system") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemTheme(getSystemTheme());
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode: (nextMode) => {
        window.localStorage.setItem(STORAGE_KEY, nextMode);
        setModeState(nextMode);
      }
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return context;
}

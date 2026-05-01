"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { REFRESH_INTERVALS, type RefreshInterval } from "@/lib/config";

const STORAGE_KEY = "cc-dashboard-refresh-interval";
const DEFAULT_INTERVAL: RefreshInterval = 60;

interface ContextValue {
  interval: RefreshInterval;
  setInterval: (next: RefreshInterval) => void;
}

const Ctx = createContext<ContextValue | null>(null);

function normalize(value: number): RefreshInterval {
  return REFRESH_INTERVALS.includes(value as RefreshInterval) ? (value as RefreshInterval) : DEFAULT_INTERVAL;
}

export function RefreshIntervalProvider({ children }: { children: React.ReactNode }) {
  const [interval, setIntervalState] = useState<RefreshInterval>(DEFAULT_INTERVAL);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const stored = Number(raw);
    if (Number.isFinite(stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIntervalState(normalize(stored));
    }
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      interval,
      setInterval: (next) => {
        window.localStorage.setItem(STORAGE_KEY, String(next));
        setIntervalState(next);
      }
    }),
    [interval]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRefreshInterval(): ContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRefreshInterval must be used inside RefreshIntervalProvider");
  return v;
}

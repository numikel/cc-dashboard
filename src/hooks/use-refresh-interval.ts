"use client";

import { useState } from "react";
import { REFRESH_INTERVALS, type RefreshInterval } from "@/lib/config";

const STORAGE_KEY = "cc-dashboard-refresh-interval";

function normalize(value: number): RefreshInterval {
  return REFRESH_INTERVALS.includes(value as RefreshInterval) ? (value as RefreshInterval) : 60;
}

export function useRefreshInterval() {
  const [interval, setIntervalState] = useState<RefreshInterval>(() => {
    if (typeof window === "undefined") {
      return 60;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return 60;
    }
    const stored = Number(raw);
    return Number.isFinite(stored) ? normalize(stored) : 60;
  });

  function setInterval(nextInterval: RefreshInterval) {
    window.localStorage.setItem(STORAGE_KEY, String(nextInterval));
    setIntervalState(nextInterval);
  }

  return { interval, setInterval };
}

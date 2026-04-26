"use client";

import { useEffect } from "react";
import { mutate as globalMutate } from "swr";
import type { RefreshInterval } from "@/lib/config";

/**
 * Periodically POSTs to /api/sync and then revalidates all SWR keys
 * whose key string starts with "/api/". Also handles manual sync events
 * dispatched via the "cc-dashboard-sync" CustomEvent.
 *
 * Uses SWR's global mutate with a key-filter function so every data hook
 * is refreshed after a sync without needing an explicit mutator reference.
 */
export function useAutoSync(interval: RefreshInterval) {
  useEffect(() => {
    async function syncAndRevalidate() {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "X-Requested-With": "cc-dashboard" }
        });
        if (!res.ok) {
          return;
        }
        await globalMutate(
          (key) => typeof key === "string" && key.startsWith("/api/")
        );
      } catch {
        // Background polling is best-effort — swallow network errors
        // (dev server restart, transient connection issues).
      }
    }

    function handleManualSync() {
      void globalMutate(
        (key) => typeof key === "string" && key.startsWith("/api/")
      );
    }

    window.addEventListener("cc-dashboard-sync", handleManualSync);
    if (interval === 0) {
      return () => window.removeEventListener("cc-dashboard-sync", handleManualSync);
    }

    const timer = window.setInterval(() => {
      void syncAndRevalidate();
    }, interval * 1000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("cc-dashboard-sync", handleManualSync);
    };
  }, [interval]);
}

import { getSqlite } from "@/lib/db/client";
import type { PricingMap } from "./types";

const CACHE_KEY = "pricing_snapshot";
const CACHE_TTL_SECONDS = 86400; // 24 hours

export function readCachedPricing(now = Date.now()): PricingMap | null {
  const row = getSqlite()
    .prepare("SELECT value, updated_at AS updatedAt FROM settings WHERE key = ?")
    .get(CACHE_KEY) as { value: string; updatedAt: string } | undefined;

  if (!row) {
    return null;
  }

  const cacheAgeSeconds = (now - Date.parse(row.updatedAt)) / 1000;
  if (Number.isNaN(cacheAgeSeconds) || cacheAgeSeconds > CACHE_TTL_SECONDS) {
    return null;
  }

  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as PricingMap;
  } catch {
    return null;
  }
}

export function writeCachedPricing(map: PricingMap): void {
  const updatedAt = new Date().toISOString();
  getSqlite()
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(CACHE_KEY, JSON.stringify(map), updatedAt);
}

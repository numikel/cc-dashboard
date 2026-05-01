import { readCache, writeCache } from "@/lib/db/api-cache";
import { PRICING_CACHE_TTL_SECONDS } from "@/lib/config";
import { PricingMapSchema } from "./types";
import type { PricingMap } from "./types";

const CACHE_KEY = "pricing_snapshot";

export function readCachedPricing(now = Date.now()): PricingMap | null {
  return readCache(CACHE_KEY, PricingMapSchema, now);
}

export function writeCachedPricing(map: PricingMap): void {
  writeCache(CACHE_KEY, map, PRICING_CACHE_TTL_SECONDS);
}

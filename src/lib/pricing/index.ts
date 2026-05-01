export type { ModelRates, PricingMap } from "./types";
export { getFallbackRates } from "./fallback";
export { readCachedPricing, writeCachedPricing } from "./cache";
export { fetchLiteLLMPricing, normalizeKey } from "./litellm";

import { readCachedPricing, writeCachedPricing } from "./cache";
import { fetchLiteLLMPricing } from "./litellm";
import { getFallbackRates } from "./fallback";
import type { ModelRates, PricingMap } from "./types";

export async function getPricingMap(): Promise<PricingMap> {
  // 1. Try 24h cache first
  const cached = readCachedPricing();
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  // 2. Fetch fresh from LiteLLM
  const fresh = await fetchLiteLLMPricing();
  if (Object.keys(fresh).length > 0) {
    writeCachedPricing(fresh);
    return fresh;
  }

  // 3. Return empty map — per-model fallback happens in getRates()
  return {};
}

export function getRates(pricingMap: PricingMap, modelId: string): ModelRates | null {
  return pricingMap[modelId] ?? getFallbackRates(modelId);
}

export function computeSessionCost(
  rates: ModelRates | null,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number
): number | null {
  if (!rates) return null;
  return (
    inputTokens * rates.inputPerToken +
    outputTokens * rates.outputPerToken +
    cacheReadTokens * rates.cacheReadPerToken +
    cacheWriteTokens * rates.cacheWritePerToken
  );
}

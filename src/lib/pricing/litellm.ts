import type { ModelRates, PricingMap } from "./types";

const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

const ALLOWED_MODES = new Set(["chat", "responses", "completion"]);

/**
 * Strip provider prefixes and date/version suffixes so that keys like
 * "anthropic.claude-sonnet-4-5-20250929-v1:0" map to "claude-sonnet-4-5".
 */
export function normalizeKey(rawKey: string): string {
  return rawKey
    .replace(/^anthropic\./, "")
    .replace(/^azure_ai\//, "")
    .replace(/^anthropic\//, "")
    .replace(/-\d{8}-v\d+:\d+$/, "") // strip -20250929-v1:0
    .replace(/-\d{8}$/, ""); // strip -YYYYMMDD
}

interface LiteLLMEntry {
  mode?: string;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_read_input_token_cost?: number;
  cache_creation_input_token_cost?: number;
  [key: string]: unknown;
}

function isLiteLLMEntry(value: unknown): value is LiteLLMEntry {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entryToRates(entry: LiteLLMEntry): ModelRates | null {
  const input = entry.input_cost_per_token;
  const output = entry.output_cost_per_token;
  // Skip entries with no pricing data
  if (typeof input !== "number" || typeof output !== "number") {
    return null;
  }
  return {
    inputPerToken: input,
    outputPerToken: output,
    cacheReadPerToken: typeof entry.cache_read_input_token_cost === "number" ? entry.cache_read_input_token_cost : 0,
    cacheWritePerToken:
      typeof entry.cache_creation_input_token_cost === "number" ? entry.cache_creation_input_token_cost : 0
  };
}

export async function fetchLiteLLMPricing(): Promise<PricingMap> {
  if (process.env.CC_DASHBOARD_DISABLE_PRICING === "1" || process.env.CC_DASHBOARD_DISABLE_PRICING === "true") {
    return {};
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let raw: unknown;
    try {
      const response = await fetch(LITELLM_URL, {
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) {
        return {};
      }
      raw = await response.json();
    } finally {
      clearTimeout(timeoutId);
    }

    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return {};
    }

    const map: PricingMap = {};

    for (const [rawKey, value] of Object.entries(raw as Record<string, unknown>)) {
      // Skip the sample spec entry
      if (rawKey === "sample_spec") {
        continue;
      }

      if (!isLiteLLMEntry(value)) {
        continue;
      }

      const mode = value.mode;
      if (typeof mode !== "string" || !ALLOWED_MODES.has(mode)) {
        continue;
      }

      const rates = entryToRates(value);
      if (!rates) {
        continue;
      }

      const bareKey = normalizeKey(rawKey);
      // First entry wins on key collision
      if (!(bareKey in map)) {
        map[bareKey] = rates;
      }
    }

    return map;
  } catch {
    return {};
  }
}

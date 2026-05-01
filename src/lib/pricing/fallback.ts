import type { ModelRates } from "./types";

const FAMILY_FALLBACK: Array<[RegExp, ModelRates]> = [
  [
    /claude-opus/i,
    {
      inputPerToken: 15e-6,
      outputPerToken: 75e-6,
      cacheReadPerToken: 1.5e-6,
      cacheWritePerToken: 18.75e-6
    }
  ],
  [
    /claude-sonnet/i,
    {
      inputPerToken: 3e-6,
      outputPerToken: 15e-6,
      cacheReadPerToken: 0.3e-6,
      cacheWritePerToken: 3.75e-6
    }
  ],
  [
    /claude-haiku/i,
    {
      inputPerToken: 0.8e-6,
      outputPerToken: 4e-6,
      cacheReadPerToken: 0.08e-6,
      cacheWritePerToken: 1e-6
    }
  ]
];

export function getFallbackRates(modelId: string): ModelRates | null {
  return FAMILY_FALLBACK.find(([re]) => re.test(modelId))?.[1] ?? null;
}

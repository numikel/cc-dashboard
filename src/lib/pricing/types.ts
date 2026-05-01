export interface ModelRates {
  inputPerToken: number; // USD per token
  outputPerToken: number;
  cacheReadPerToken: number;
  cacheWritePerToken: number;
}

export type PricingMap = Record<string, ModelRates>; // key = bare model id

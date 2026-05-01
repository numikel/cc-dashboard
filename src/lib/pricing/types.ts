import { z } from "zod";

export const ModelRatesSchema = z.object({
  inputPerToken: z.number(),
  outputPerToken: z.number(),
  cacheReadPerToken: z.number(),
  cacheWritePerToken: z.number()
});

export const PricingMapSchema = z.record(z.string(), ModelRatesSchema);

export type ModelRates = z.infer<typeof ModelRatesSchema>;
export type PricingMap = z.infer<typeof PricingMapSchema>;

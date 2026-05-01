import { z } from "zod";
import type { NextRequest } from "next/server";

const ListParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

export type ListParams = z.infer<typeof ListParamsSchema>;

export function parseListParams(request: NextRequest): ListParams {
  const sp = request.nextUrl.searchParams;
  return ListParamsSchema.parse({
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined
  });
}

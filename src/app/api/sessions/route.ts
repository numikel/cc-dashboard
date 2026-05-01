import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listSessions, windowToSince } from "@/lib/api/queries";
import { parseListParams } from "@/lib/api/list-params";
import { getPricingMap, getRates, computeSessionCost } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WindowSchema = z.enum(["1d", "7d", "30d", "all"]).default("all");

export async function GET(request: NextRequest) {
  const { limit, offset } = parseListParams(request);
  const rawWindow = request.nextUrl.searchParams.get("window") ?? undefined;
  const windowResult = WindowSchema.safeParse(rawWindow);
  const window = windowResult.success ? windowResult.data : "all";
  const since = windowToSince(window);

  const pricingMap = await getPricingMap();
  const sessions = listSessions(limit, offset, since);

  const sessionsWithCost = sessions.map((s) => ({
    ...s,
    costUsd: computeSessionCost(
      getRates(pricingMap, s.model ?? ""),
      s.inputTokens,
      s.outputTokens,
      s.cacheReadTokens,
      s.cacheWriteTokens
    )
  }));

  return NextResponse.json({ sessions: sessionsWithCost });
}

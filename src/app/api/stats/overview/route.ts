import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOverviewStats, windowToSince } from "@/lib/api/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WindowSchema = z.enum(["1d", "7d", "30d", "all"]).default("all");

export function GET(request: NextRequest) {
  const rawWindow = request.nextUrl.searchParams.get("window") ?? undefined;
  const windowResult = WindowSchema.safeParse(rawWindow);
  const window = windowResult.success ? windowResult.data : "all";
  const since = windowToSince(window);

  return NextResponse.json(getOverviewStats(since));
}

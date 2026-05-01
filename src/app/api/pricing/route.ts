import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db/client";
import { getPricingMap } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const map = await getPricingMap();

  // Read the updated_at timestamp from settings cache if available
  const row = getSqlite()
    .prepare("SELECT updated_at AS updatedAt FROM settings WHERE key = 'pricing_snapshot'")
    .get() as { updatedAt: string } | undefined;

  return NextResponse.json({
    models: Object.keys(map).length,
    disabled: process.env.CC_DASHBOARD_DISABLE_PRICING === "1" || process.env.CC_DASHBOARD_DISABLE_PRICING === "true",
    cachedAt: row?.updatedAt ?? null
  });
}

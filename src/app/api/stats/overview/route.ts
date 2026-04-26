import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/api/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getOverviewStats());
}

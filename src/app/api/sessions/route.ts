import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/api/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") ?? 0), 0);

  return NextResponse.json({ sessions: listSessions(limit, offset) });
}

import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/config";
import { getSqlite } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  try {
    getSqlite().prepare("SELECT 1").get();
    return NextResponse.json({
      status: "ok",
      version: APP_VERSION,
      db: "ready"
    });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unavailable" },
      { status: 503 }
    );
  }
}

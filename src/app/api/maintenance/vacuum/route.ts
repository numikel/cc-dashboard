import { NextResponse, type NextRequest } from "next/server";
import { getSqlite } from "@/lib/db/client";
import { rejectsCsrf } from "@/lib/api/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (rejectsCsrf(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = getSqlite();

  // Read page_count and page_size before VACUUM for size delta
  const beforePages = (db.pragma("page_count", { simple: true }) as number) ?? 0;
  const pageSize = (db.pragma("page_size", { simple: true }) as number) ?? 4096;
  const beforeBytes = beforePages * pageSize;

  db.exec("VACUUM");

  const afterPages = (db.pragma("page_count", { simple: true }) as number) ?? 0;
  const afterBytes = afterPages * pageSize;

  return NextResponse.json({ ok: true, beforeBytes, afterBytes });
}

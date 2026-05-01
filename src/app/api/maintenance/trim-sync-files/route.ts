import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSqlite } from "@/lib/db/client";
import { rejectsCsrf } from "@/lib/api/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  olderThanDays: z.number().int().min(1).max(365).default(30)
});

export async function POST(request: NextRequest) {
  if (rejectsCsrf(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { olderThanDays } = parsed.data;
  const result = getSqlite()
    .prepare(
      `DELETE FROM sync_files
       WHERE last_indexed_at IS NOT NULL
         AND last_indexed_at < datetime('now', '-' || ? || ' days')`
    )
    .run(olderThanDays);

  return NextResponse.json({ ok: true, deletedRows: result.changes });
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rejectsCsrf } from "@/lib/api/csrf";
import { clearCache } from "@/lib/db/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  scope: z.enum(["pricing", "usage", "all"])
});

const SCOPE_KEYS: Record<string, string[]> = {
  pricing: ["pricing_snapshot"],
  usage: ["official_usage_cache"]
};

export async function POST(request: NextRequest) {
  if (rejectsCsrf(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { scope } = parsed.data;
  let deletedRows = 0;

  if (scope === "all") {
    deletedRows = clearCache();
  } else {
    const keys = SCOPE_KEYS[scope] ?? [];
    for (const key of keys) {
      deletedRows += clearCache(key);
    }
  }

  return NextResponse.json({ ok: true, scope, deletedRows });
}

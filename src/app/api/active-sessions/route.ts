import { NextResponse } from "next/server";
import { getActiveSessions } from "@/lib/claude/active-sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const activeSessions = (await getActiveSessions()).map((session) => ({
    id: session.id,
    name: session.name,
    status: session.status,
    pid: session.pid,
    cwd: session.cwd,
    updatedAt: session.updatedAt
  }));
  return NextResponse.json({ activeSessions });
}

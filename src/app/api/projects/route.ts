import { NextResponse } from "next/server";
import { listProjects } from "@/lib/api/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ projects: listProjects() });
}

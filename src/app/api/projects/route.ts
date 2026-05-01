import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listProjects, getTopProjectsByCost, windowToSince } from "@/lib/api/queries";
import { parseListParams } from "@/lib/api/list-params";
import { getPricingMap } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WindowSchema = z.enum(["1d", "7d", "30d", "all"]).default("all");

export async function GET(request: NextRequest) {
  const { limit, offset } = parseListParams(request);
  const rawWindow = request.nextUrl.searchParams.get("window") ?? undefined;
  const windowResult = WindowSchema.safeParse(rawWindow);
  const window = windowResult.success ? windowResult.data : "all";
  const since = windowToSince(window);

  const pricingMap = await getPricingMap();

  // Build a cost map from the project cost query for quick lookup
  const projectCosts = getTopProjectsByCost(pricingMap, since, 10000);
  const costByPath = new Map(projectCosts.map((p) => [p.path, p.costUsd]));

  const projects = listProjects(limit, offset, since);
  const projectsWithCost = projects.map((p) => ({
    ...p,
    totalCostUsd: costByPath.get(p.path) ?? null
  }));

  return NextResponse.json({ projects: projectsWithCost });
}

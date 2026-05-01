import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPricingMap } from "@/lib/pricing";
import { windowToSince, getModelCosts, getDailyCosts, getTopProjectsByCost } from "@/lib/api/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WindowSchema = z.enum(["1d", "7d", "30d", "all"]).default("7d");

export async function GET(request: NextRequest) {
  const rawWindow = request.nextUrl.searchParams.get("window") ?? undefined;
  const windowResult = WindowSchema.safeParse(rawWindow);
  const window = windowResult.success ? windowResult.data : "7d";
  const since = windowToSince(window);

  const pricingMap = await getPricingMap();
  const disabledPricing =
    process.env.CC_DASHBOARD_DISABLE_PRICING === "1" ||
    process.env.CC_DASHBOARD_DISABLE_PRICING === "true";

  const byModel = getModelCosts(pricingMap, since);
  const dailyCosts = getDailyCosts(pricingMap, since);
  const topProjects = getTopProjectsByCost(pricingMap, since, 5);

  // Sum only models with known pricing; unknown models are listed separately.
  // A single unknown model should not zero out the entire total.
  const unknownModels = byModel.filter((row) => row.costUsd === null).map((row) => row.model);
  const pricedRows = byModel.filter((row) => row.costUsd !== null);
  const totalCostUsd: number | null =
    pricedRows.length > 0 ? pricedRows.reduce((acc, row) => acc + (row.costUsd as number), 0) : null;

  return NextResponse.json({
    window,
    totalCostUsd,
    isEstimated: true,
    byModel,
    dailyCosts,
    topProjects,
    unknownModels,
    disabledPricing
  });
}

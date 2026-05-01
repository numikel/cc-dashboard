import { CostsPageClient } from "@/components/costs/costs-page-client";
import type { CostsResponse } from "@/components/costs/costs-page-client";
import { getPricingMap } from "@/lib/pricing";
import { getModelCosts, getDailyCosts, getTopProjectsByCost, windowToSince } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const since = windowToSince("7d");
  const disabled =
    process.env.CC_DASHBOARD_DISABLE_PRICING === "1" ||
    process.env.CC_DASHBOARD_DISABLE_PRICING === "true";

  let initialData: CostsResponse;

  if (!disabled) {
    const pricingMap = await getPricingMap();
    const byModel = getModelCosts(pricingMap, since);
    const dailyCosts = getDailyCosts(pricingMap, since);
    const topProjects = getTopProjectsByCost(pricingMap, since, 5);

    const unknownModels = byModel.filter((row) => row.costUsd === null).map((row) => row.model);
    const pricedRows = byModel.filter((row) => row.costUsd !== null);
    const totalCostUsd = pricedRows.length > 0
      ? pricedRows.reduce((acc, row) => acc + (row.costUsd as number), 0)
      : null;

    initialData = {
      window: "7d",
      totalCostUsd,
      isEstimated: true,
      byModel,
      dailyCosts,
      topProjects,
      unknownModels,
      disabledPricing: false
    };
  } else {
    initialData = {
      window: "7d",
      totalCostUsd: null,
      isEstimated: false,
      byModel: [],
      dailyCosts: [],
      topProjects: [],
      unknownModels: [],
      disabledPricing: true
    };
  }

  return <CostsPageClient initialData={initialData} initialWindow="7d" />;
}

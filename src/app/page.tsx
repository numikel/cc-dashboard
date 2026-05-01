import { OverviewDashboardClient } from "@/components/overview-dashboard";
import { getOverviewStats, windowToSince, computeOverviewCostsTotal } from "@/lib/api/queries";
import { getPricingMap } from "@/lib/pricing";
import { getActiveSessions } from "@/lib/claude/active-sessions";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const since = windowToSince("7d");
  const [stats, pricingMap, activeSessions] = await Promise.all([
    Promise.resolve(getOverviewStats(since)),
    getPricingMap(),
    getActiveSessions()
  ]);
  const costs = computeOverviewCostsTotal(pricingMap, since, "7d");

  return (
    <OverviewDashboardClient
      initialStats={stats}
      initialActive={{ activeSessions }}
      initialCosts={costs}
      initialWindow="7d"
    />
  );
}

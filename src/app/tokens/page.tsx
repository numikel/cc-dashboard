import type { Metadata } from "next";
import { ModelBreakdown } from "@/components/charts/model-breakdown";
import { TokenTimeline } from "@/components/charts/token-timeline";
import { StatCard } from "@/components/stat-card";
import { getOverviewStats } from "@/lib/api/queries";

export const metadata: Metadata = {
  title: "Tokens · CC dashboard",
};

export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const stats = await Promise.resolve(getOverviewStats());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold">Tokens</h2>
        <p className="mt-1 muted">Subscription-friendly usage metrics without USD cost estimation.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Input tokens" value={stats.inputTokens.toLocaleString()} />
        <StatCard label="Output tokens" value={stats.outputTokens.toLocaleString()} />
        <StatCard label="Cache tokens" value={stats.cacheTokens.toLocaleString()} />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <TokenTimeline data={stats.timeline} />
        <ModelBreakdown data={stats.modelBreakdown} />
      </section>
    </div>
  );
}

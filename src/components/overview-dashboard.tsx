"use client";

import { useState } from "react";
import { ModelBreakdown } from "@/components/charts/model-breakdown";
import { TokenTimeline } from "@/components/charts/token-timeline";
import { StatCard } from "@/components/stat-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import type { TimeWindow } from "@/components/time-range-filter";
import { UsageLimitsCard } from "@/components/usage-limits-card";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";
import type { OverviewStats } from "@/lib/api/queries";

interface ActiveSessionsResponse {
  activeSessions: Array<{ id: string }>;
}

interface CostsResponse {
  totalCostUsd: number | null;
  disabledPricing: boolean;
  window: string;
}

function formatCost(usd: number | null): string {
  if (usd === null) return "–";
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: "var(--color-bg-muted)" }} />;
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading dashboard metadata">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <article key={'stat-skel-' + index} className="panel p-6">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="mt-5 h-10 w-36" />
            <SkeletonBlock className="mt-4 h-4 w-44" />
          </article>
        ))}
      </section>
      <section className="grid gap-7 xl:grid-cols-2">
        <div className="panel h-96 p-5">
          <SkeletonBlock className="h-full w-full" />
        </div>
        <div className="panel h-96 p-5">
          <SkeletonBlock className="h-full w-full" />
        </div>
      </section>
    </div>
  );
}

interface OverviewDashboardClientProps {
  initialStats: OverviewStats;
  initialActive: ActiveSessionsResponse;
  initialCosts: CostsResponse;
  initialWindow: TimeWindow;
}

export function OverviewDashboardClient({
  initialStats,
  initialActive,
  initialCosts,
  initialWindow
}: OverviewDashboardClientProps) {
  const [window, setWindow] = useState<TimeWindow>(initialWindow);
  const { interval } = useRefreshInterval();
  const stats = useDashboardData<OverviewStats>(
    "/api/stats/overview?window=" + window,
    interval,
    { fallbackData: window === initialWindow ? initialStats : undefined }
  );
  const active = useDashboardData<ActiveSessionsResponse>(
    "/api/active-sessions",
    interval,
    { fallbackData: initialActive }
  );
  const costs = useDashboardData<CostsResponse>(
    `/api/costs?window=${window}`,
    interval,
    { fallbackData: window === initialWindow ? initialCosts : undefined }
  );
  useAutoSync(interval);

  if (stats.error) {
    return <div className="panel p-6 text-sm">Unable to load dashboard data: {stats.error.message}</div>;
  }

  const data = stats.data;
  if (!data) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      {stats.isValidating ? (
        <div className="panel flex items-center gap-3 px-4 py-3 text-sm muted" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--color-accent-strong)" }} />
          Refreshing dashboard data...
        </div>
      ) : null}

      <UsageLimitsCard />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <TimeRangeFilter value={window} onChange={setWindow} />
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total tokens" value={data.totalTokens.toLocaleString()} hint="Input, output and cache tokens" />
        <StatCard label="Sessions" value={data.sessions.toLocaleString()} hint={`${data.projects} indexed projects`} />
        <StatCard label="Most used model" value={data.mostUsedModel ?? "unknown"} hint="By token volume" />
        <StatCard label="Active sessions" value={active.data?.activeSessions.length ?? 0} hint="Read from local Claude state" />
        <StatCard
          label="Cost estimate"
          value={formatCost(costs.data?.totalCostUsd ?? null)}
          hint={costs.data?.disabledPricing ? "Pricing disabled" : "Input + output tokens"}
        />
      </section>

      <section className="grid min-w-0 gap-7 xl:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-4 text-2xl font-semibold">Token timeline</h2>
          <TokenTimeline data={data.timeline} />
        </div>
        <div className="min-w-0">
          <h2 className="mb-4 text-2xl font-semibold">Model breakdown</h2>
          <ModelBreakdown data={data.modelBreakdown} />
        </div>
      </section>

      <section className="terminal-panel rounded-2xl p-6">
        <p className="text-sm" style={{ color: "var(--color-accent)" }}>
          Metadata-only mode
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-terminal-text)]">
          This dashboard stores usage metadata only: token counts, timestamps, models, project paths and aggregate session
          data. Prompt and assistant message content are intentionally ignored.
        </p>
      </section>
    </div>
  );
}

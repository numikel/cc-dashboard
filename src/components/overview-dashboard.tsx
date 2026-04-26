"use client";

import { ModelBreakdown } from "@/components/charts/model-breakdown";
import { TokenTimeline } from "@/components/charts/token-timeline";
import { StatCard } from "@/components/stat-card";
import { UsageLimitsCard } from "@/components/usage-limits-card";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";
import type { OverviewStats } from "@/lib/api/queries";

interface ActiveSessionsResponse {
  activeSessions: Array<{ id: string }>;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: "var(--color-bg-muted)" }} />;
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-label="Loading dashboard metadata">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
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

export function OverviewDashboard() {
  const { interval } = useRefreshInterval();
  const stats = useDashboardData<OverviewStats>("/api/stats/overview", interval);
  const active = useDashboardData<ActiveSessionsResponse>("/api/active-sessions", interval);
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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tokens" value={data.totalTokens.toLocaleString()} hint="Input, output and cache tokens" />
        <StatCard label="Sessions" value={data.sessions.toLocaleString()} hint={`${data.projects} indexed projects`} />
        <StatCard label="Most used model" value={data.mostUsedModel ?? "unknown"} hint="By token volume" />
        <StatCard label="Active sessions" value={active.data?.activeSessions.length ?? 0} hint="Read from local Claude state" />
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

"use client";

import { useState } from "react";
import { StatCard } from "@/components/stat-card";
import { DailyCostChart } from "@/components/costs/daily-cost-chart";
import { ModelCostBreakdown } from "@/components/costs/model-cost-breakdown";
import { TopProjectsCost } from "@/components/costs/top-projects-cost";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { formatCost } from "@/lib/format";

type TimeWindow = "1d" | "7d" | "30d" | "all";

export interface CostsResponse {
  window: string;
  totalCostUsd: number | null;
  isEstimated: boolean;
  byModel: Array<{
    model: string;
    costUsd: number | null;
    sessions: number;
    totalTokens: number;
  }>;
  dailyCosts: Array<{
    date: string;
    costUsd: number | null;
  }>;
  topProjects: Array<{
    name: string;
    path: string;
    costUsd: number | null;
    sessions: number;
  }>;
  unknownModels: string[];
  disabledPricing: boolean;
}

interface CostsPageClientProps {
  initialData?: CostsResponse;
  initialWindow: TimeWindow;
}

export function CostsPageClient({ initialData, initialWindow }: CostsPageClientProps) {
  const [window, setWindow] = useState<TimeWindow>(initialWindow);
  const { interval } = useRefreshInterval();

  useAutoSync(interval);

  const costs = useDashboardData<CostsResponse>(
    `/api/costs?window=${window}`,
    interval,
    { fallbackData: window === initialWindow ? initialData : undefined }
  );

  const pricedModels = (costs.data?.byModel ?? []).filter((m) => m.costUsd !== null);
  const totalSessions = (costs.data?.byModel ?? []).reduce((s, m) => s + m.sessions, 0);
  const avgCostPerSession =
    totalSessions > 0 && costs.data?.totalCostUsd != null
      ? costs.data.totalCostUsd / totalSessions
      : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Heading + filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Cost estimate</h2>
          <p className="mt-1 muted">Estimated based on LiteLLM public pricing.</p>
        </div>
        <TimeRangeFilter value={window} onChange={setWindow} />
      </div>

      {/* Disabled pricing notice */}
      {costs.data?.disabledPricing && (
        <div
          role="alert"
          className="terminal-panel rounded-2xl px-5 py-4 text-sm"
        >
          <span style={{ color: "var(--color-accent)" }} className="font-medium">
            Pricing disabled
          </span>
          <span className="ml-2" style={{ color: "var(--color-terminal-text)" }}>
            Cost estimation is turned off (CC_DASHBOARD_DISABLE_PRICING=1). Remove this variable to
            enable pricing.
          </span>
        </div>
      )}

      {/* Skeleton loading state */}
      {!costs.data && !costs.error && (
        <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading cost data">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="panel p-6 animate-pulse">
                <div className="h-4 w-24 rounded bg-[var(--color-border)]" />
                <div className="mt-4 h-10 w-32 rounded bg-[var(--color-border)]" />
                <div className="mt-2 h-3 w-40 rounded bg-[var(--color-border-soft)]" />
              </div>
            ))}
          </div>
          <div className="panel h-96 animate-pulse" />
        </div>
      )}

      {/* Error state */}
      {costs.error && (
        <div role="alert" className="panel p-6">
          <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            Failed to load cost data
          </p>
          <p className="mt-1 text-sm muted">{String(costs.error)}</p>
        </div>
      )}

      {/* Main content */}
      {costs.data && (
        <>
          {/* Stats row */}
          <section
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
            aria-label="Cost summary statistics"
          >
            <StatCard
              label="Total cost"
              value={formatCost(costs.data.totalCostUsd)}
              hint="Estimated (input + output + cache)"
            />
            <StatCard
              label="Models priced"
              value={pricedModels.length}
              hint="Models with known pricing"
            />
            <StatCard
              label="Unknown models"
              value={costs.data.unknownModels.length}
              hint="No pricing available"
            />
            <StatCard
              label="Avg cost / session"
              value={formatCost(avgCostPerSession)}
              hint={`Across ${totalSessions} session${totalSessions !== 1 ? "s" : ""}`}
            />
          </section>

          {/* Charts grid */}
          <section
            className="grid min-w-0 gap-7 xl:grid-cols-2"
            aria-label="Cost charts"
          >
            <div className="min-w-0">
              <h3 className="mb-4 text-xl font-semibold">Daily cost</h3>
              <DailyCostChart data={costs.data.dailyCosts} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-4 text-xl font-semibold">Cost by model</h3>
              <ModelCostBreakdown data={costs.data.byModel} />
            </div>
          </section>

          {/* Unknown models callout */}
          {costs.data.unknownModels.length > 0 && (
            <div
              className="panel px-5 py-4 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="font-medium" style={{ color: "var(--color-accent)" }}>
                Models without pricing data
              </p>
              <p className="mt-1 muted">
                {costs.data.unknownModels.join(", ")} — cost for these models is excluded from
                totals.
              </p>
            </div>
          )}

          {/* Top projects */}
          <div>
            <h3 className="mb-4 text-xl font-semibold">Top projects by cost</h3>
            <TopProjectsCost projects={costs.data.topProjects} />
          </div>

          {/* Disclaimer terminal panel */}
          <section className="terminal-panel rounded-2xl p-6">
            <p className="text-sm" style={{ color: "var(--color-accent)" }}>
              Estimate only
            </p>
            <p
              className="mt-2 max-w-3xl text-sm leading-6"
              style={{ color: "var(--color-terminal-text)" }}
            >
              Costs are estimated from LiteLLM public pricing data and may differ from Anthropic
              invoices. Cache read/write tokens use separate rates where available.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

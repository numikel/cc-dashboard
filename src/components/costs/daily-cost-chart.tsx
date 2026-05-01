"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DailyCostPoint {
  date: string;
  costUsd: number | null;
}

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border-soft)",
  borderRadius: "12px",
  boxShadow: "var(--shadow-panel)"
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: "var(--color-text-muted)" };
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: "var(--color-text)" };

function formatCostAxis(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

function formatCostTooltip(value: number): string {
  if (value === 0) return "$0.0000";
  if (value < 0.001) return `$${value.toFixed(6)}`;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(4)}`;
}

function formatCost(usd: number | null): string {
  if (usd === null) return "–";
  if (usd === 0) return "$0.00";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function DailyCostChart({ data }: { data: DailyCostPoint[] }) {
  const chartData = data.map((p) => ({
    date: p.date,
    costUsd: p.costUsd ?? 0
  }));

  if (data.length === 0) {
    return (
      <div className="panel flex h-96 items-center justify-center muted">
        No cost data yet.
      </div>
    );
  }

  const total = chartData.reduce((s, p) => s + p.costUsd, 0);
  const top3 = [...chartData].sort((a, b) => b.costUsd - a.costUsd).slice(0, 3);
  const dateRange = data.length ? `${data[0].date} to ${data[data.length - 1].date}` : "no data";
  const summary = `Daily cost chart: ${formatCost(total)} total estimated cost across ${data.length} days (${dateRange}). Top dates: ${top3.map((p) => `${p.date} with ${formatCost(p.costUsd)}`).join(", ")}.`;

  return (
    <div className="panel h-96 min-w-0 p-5" role="img" aria-label={summary}>
      <p className="sr-only">{summary}</p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid stroke="var(--color-border-soft)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            tickFormatter={formatCostAxis}
            width={64}
          />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(value) => [formatCostTooltip(Number(value)), "Cost (est.)"]}
            cursor={{ fill: "var(--color-border-soft)", opacity: 0.5 }}
          />
          <Bar dataKey="costUsd" name="Cost" fill="var(--color-accent-strong)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

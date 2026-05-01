"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  date: string;
  totalTokens: number;
  sessions: number;
}

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  background: "var(--color-panel)",
  border: "1px solid var(--color-border-soft)",
  borderRadius: "12px",
  boxShadow: "var(--shadow-panel)"
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: "var(--color-text-muted)" };
const TOOLTIP_ITEM_STYLE: React.CSSProperties = { color: "var(--color-text)" };

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatTooltipTokens(value: number): string {
  return value.toLocaleString();
}

export function TokenTimeline({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <div className="panel flex h-96 items-center justify-center muted">No timeline data yet.</div>;
  }

  const total = data.reduce((s, p) => s + p.totalTokens, 0);
  const top3 = [...data].sort((a, b) => b.totalTokens - a.totalTokens).slice(0, 3);
  const dateRange = data.length ? `${data[0].date} to ${data[data.length - 1].date}` : "no data";
  const summary = `Token timeline: ${total.toLocaleString()} total tokens across ${data.length} days (${dateRange}). Top dates: ${top3.map((p) => `${p.date} with ${p.totalTokens.toLocaleString()} tokens`).join(", ")}.`;

  return (
    <div className="panel h-96 min-w-0 p-5" role="img" aria-label={summary}>
      <p className="sr-only">{summary}</p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={data} barCategoryGap="30%">
          <CartesianGrid stroke="var(--color-border-soft)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" stroke="var(--color-text-muted)" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            tickFormatter={formatTokens}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(value) => [formatTooltipTokens(Number(value)), "Tokens"]}
            cursor={{ fill: "var(--color-border-soft)", opacity: 0.5 }}
          />
          <Bar dataKey="totalTokens" name="Tokens" fill="var(--color-accent-strong)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

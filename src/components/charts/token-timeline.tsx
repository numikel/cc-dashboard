"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function TokenTimeline({ data }: { data: Point[] }) {
  const gradientId = useId();

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
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border-soft)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--color-text-muted)" />
          <YAxis stroke="var(--color-text-muted)" />
          <Tooltip
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={{ stroke: "var(--color-border)", strokeDasharray: "3 3" }}
          />
          <Area dataKey="totalTokens" name="Tokens" stroke="var(--color-accent-strong)" fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

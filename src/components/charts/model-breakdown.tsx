"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts";

interface ModelPoint {
  model: string;
  totalTokens: number;
  sessions: number;
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)"
];

function renderModelLabel({ cx, cy, midAngle, outerRadius, percent }: PieLabelRenderProps) {
  const percentage = Number(percent ?? 0);
  if (percentage < 0.08) {
    return null;
  }

  const centerX = Number(cx);
  const centerY = Number(cy);
  const radius = Number(outerRadius) + 18;
  const angle = -Number(midAngle) * (Math.PI / 180);
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  if (![centerX, centerY, radius, x, y].every(Number.isFinite)) {
    return null;
  }

  return (
    <text x={x} y={y} fill="var(--color-text)" textAnchor={x > centerX ? "start" : "end"} dominantBaseline="central" fontSize={12}>
      {`${Math.round(percentage * 100)}%`}
    </text>
  );
}

export function ModelBreakdown({ data }: { data: ModelPoint[] }) {
  if (data.length === 0) {
    return <div className="panel flex h-96 items-center justify-center muted">No model usage yet.</div>;
  }

  const total = data.reduce((s, d) => s + d.totalTokens, 0);
  const summary = `Model breakdown: ${total.toLocaleString()} total tokens across ${data.length} models. Top: ${data.slice(0, 3).map((d) => `${d.model} ${total > 0 ? ((d.totalTokens / total) * 100).toFixed(1) : "0.0"}%`).join(", ")}.`;

  return (
    <div className="panel h-96 min-w-0 p-5" role="img" aria-label={summary}>
      <p className="sr-only">{summary}</p>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
        <PieChart>
          <Pie
            data={data}
            dataKey="totalTokens"
            nameKey="model"
            outerRadius={118}
            innerRadius={62}
            paddingAngle={3}
            label={renderModelLabel}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={entry.model} style={{ fill: CHART_COLORS[index % CHART_COLORS.length] }} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-panel)",
              border: "1px solid var(--color-border-soft)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-panel)"
            }}
            labelStyle={{ color: "var(--color-text-muted)" }}
            itemStyle={{ color: "var(--color-text)" }}
          />
          <Legend
            iconType="circle"
            verticalAlign="bottom"
            formatter={(value) => <span style={{ color: "var(--color-text)" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

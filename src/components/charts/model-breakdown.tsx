"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type PieLabelRenderProps } from "recharts";

interface ModelPoint {
  model: string;
  totalTokens: number;
  sessions: number;
}

// Visually distinct palette — avoids the monochromatic orange problem
const PALETTE = [
  "#e07052", // terracotta (accent)
  "#4e9fd4", // blue
  "#5ab87a", // green
  "#9b72cf", // purple
  "#e8c14a", // gold
  "#e05580", // rose
  "#4fc4c4", // teal
  "#f0923b", // orange
];

function buildColorMap(models: string[]): Record<string, string> {
  return Object.fromEntries(models.map((m, i) => [m, PALETTE[i % PALETTE.length]]));
}

function renderModelLabel({ cx, cy, midAngle, outerRadius, percent }: PieLabelRenderProps) {
  const percentage = Number(percent ?? 0);
  if (percentage < 0.08) return null;

  const centerX = Number(cx);
  const centerY = Number(cy);
  const radius = Number(outerRadius) + 18;
  const angle = -Number(midAngle) * (Math.PI / 180);
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  if (![centerX, centerY, radius, x, y].every(Number.isFinite)) return null;

  return (
    <text x={x} y={y} fill="var(--color-text)" textAnchor={x > centerX ? "start" : "end"} dominantBaseline="central" fontSize={12}>
      {`${Math.round(percentage * 100)}%`}
    </text>
  );
}

export function ModelBreakdown({ data }: { data: ModelPoint[] }) {
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());

  if (data.length === 0) {
    return <div className="panel flex h-96 items-center justify-center muted">No model usage yet.</div>;
  }

  const colorMap = buildColorMap(data.map((d) => d.model));
  const visibleData = data.filter((d) => !hiddenModels.has(d.model));

  const total = data.reduce((s, d) => s + d.totalTokens, 0);
  const summary = `Model breakdown: ${total.toLocaleString()} total tokens across ${data.length} models. Top: ${data.slice(0, 3).map((d) => `${d.model} ${total > 0 ? ((d.totalTokens / total) * 100).toFixed(1) : "0.0"}%`).join(", ")}.`;

  function toggleModel(model: string) {
    setHiddenModels((prev) => {
      const next = new Set(prev);
      if (next.has(model)) next.delete(model);
      else next.add(model);
      return next;
    });
  }

  return (
    <div className="panel flex min-w-0 flex-col p-5" role="img" aria-label={summary}>
      <p className="sr-only">{summary}</p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
          <PieChart>
            <Pie
              data={visibleData}
              dataKey="totalTokens"
              nameKey="model"
              outerRadius={108}
              innerRadius={56}
              paddingAngle={3}
              label={renderModelLabel}
              labelLine={false}
            >
              {visibleData.map((entry) => (
                <Cell key={entry.model} fill={colorMap[entry.model]} />
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
              formatter={(value) => [Number(value).toLocaleString(), "Tokens"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom clickable legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2">
        {data.map((entry) => {
          const hidden = hiddenModels.has(entry.model);
          return (
            <button
              key={entry.model}
              type="button"
              onClick={() => toggleModel(entry.model)}
              className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs transition hover:opacity-80"
              style={{
                color: hidden ? "var(--color-text-muted)" : "var(--color-text)",
                opacity: hidden ? 0.5 : 1
              }}
              aria-pressed={!hidden}
              aria-label={`${hidden ? "Show" : "Hide"} ${entry.model}`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: hidden ? "var(--color-border)" : colorMap[entry.model] }}
              />
              <span style={{ textDecoration: hidden ? "line-through" : "none" }}>{entry.model}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

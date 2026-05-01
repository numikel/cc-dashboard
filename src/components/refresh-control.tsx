"use client";

import { REFRESH_INTERVALS, type RefreshInterval } from "@/lib/config";

const LABELS: Record<RefreshInterval, string> = {
  0: "OFF",
  30: "30s",
  60: "60s",
  180: "180s",
  300: "300s"
};

interface RefreshControlProps {
  value: RefreshInterval;
  onChange: (value: RefreshInterval) => void;
}

export function RefreshControl({ value, onChange }: RefreshControlProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="select-none" style={{ color: "var(--color-text-muted)" }}>
        Refresh
      </span>
      <select
        aria-label="Refresh interval"
        className="rounded-lg border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-accent-strong)]"
        style={{
          background: "var(--color-bg-muted)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as RefreshInterval)}
      >
        {REFRESH_INTERVALS.map((interval) => (
          <option key={interval} value={interval}>
            {LABELS[interval]}
          </option>
        ))}
      </select>
    </label>
  );
}

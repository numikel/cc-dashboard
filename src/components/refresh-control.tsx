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
  isRefreshing?: boolean;
  onChange: (value: RefreshInterval) => void;
  onRefresh?: () => void;
}

export function RefreshControl({ value, isRefreshing = false, onChange, onRefresh }: RefreshControlProps) {
  return (
    <div className="flex items-center gap-2 text-sm muted" aria-busy={isRefreshing}>
      <span aria-live="polite">{isRefreshing ? "Updating..." : "Refresh"}</span>
      <select
        aria-label="Refresh interval"
        className="rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-accent-strong)]"
        style={{
          background: "var(--color-panel)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)"
        }}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as RefreshInterval)}
      >
        {REFRESH_INTERVALS.map((interval) => (
          <option key={interval} value={interval}>
            {LABELS[interval]}
          </option>
        ))}
      </select>
      <button
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:cursor-wait disabled:opacity-75"
        style={{ background: "var(--color-accent-strong)" }}
        type="button"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        {isRefreshing ? <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" /> : null}
        {isRefreshing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}

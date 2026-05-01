"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";
import { SESSION_WINDOW_MS, WEEKLY_WINDOW_MS } from "@/lib/config";
import type { UsageLimitRow, UsageLimits } from "@/lib/api/queries";

const DISPLAY_LIMIT_IDS = ["current-session", "weekly-all", "weekly-sonnet"] as const;

function formatTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return value.toLocaleString();
}

function formatQuota(row: UsageLimitRow): string {
  return row.quotaLabel ?? `${row.valueLabel ?? formatTokens(row.used)} / ${formatTokens(row.max)}`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function ResetCountdown({ label, resetAt, windowMs }: { label: string; resetAt: string | null; windowMs: number }) {
  const resetTime = useMemo(() => {
    if (!resetAt) return null;
    const parsed = new Date(resetAt).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }, [resetAt]);

  const [now, setNow] = useState(() => Date.now());

  // sr-only text updated only on minute boundary changes (not every second)
  const [srMinutesLeft, setSrMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!resetTime) return;
    let timer: number | null = null;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      const mins = Math.ceil(Math.max(0, resetTime - current) / 60000);
      setSrMinutesLeft((prev) => (prev !== mins ? mins : prev));
    };

    const start = () => {
      if (timer !== null) return;
      tick();
      timer = window.setInterval(tick, 1000);
    };

    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    if (document.visibilityState === "visible") start();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [resetTime]);

  if (!resetTime) {
    return null;
  }

  const remainingMs = resetTime - now;
  const remainingLabel = remainingMs > 0 ? `${formatDuration(remainingMs)} left` : "Reset pending";
  const remainingPercentage = Math.min(100, Math.max(0, (remainingMs / windowMs) * 100));

  return (
    <div className="mt-5 rounded-2xl border p-3" style={{ borderColor: "var(--color-border-soft)", background: "var(--color-panel)" }}>
      <div className="flex items-center gap-3">
        {/* Donut — static aria-label, visual only */}
        <div
          role="img"
          aria-label={`${label} usage donut`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-accent) ${remainingPercentage}%, var(--color-bg-muted) 0)`
          }}
        >
          <div className="h-10 w-10 rounded-full" style={{ background: "var(--color-panel)" }} />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide muted">{label}</p>
          {/* Visual countdown — aria-hidden so SR uses the sr-only span instead */}
          <p aria-hidden="true" className="mt-1 text-lg font-semibold tabular-nums">{remainingLabel}</p>
        </div>
      </div>
      {/* SR-only announcement — updates only on minute change to avoid noisy per-second announcements */}
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {srMinutesLeft !== null && srMinutesLeft > 0
          ? `${label} resets in ${srMinutesLeft} minute${srMinutesLeft === 1 ? "" : "s"}`
          : srMinutesLeft === 0
          ? `${label} reset pending`
          : ""}
      </span>
    </div>
  );
}

function UsageSkeleton() {
  return (
    <section className="panel p-5 sm:p-7" aria-label="Loading plan usage limits">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="h-6 w-44 animate-pulse rounded-lg" style={{ background: "var(--color-bg-muted)" }} />
          <div className="mt-3 h-4 w-full max-w-72 animate-pulse rounded-lg" style={{ background: "var(--color-bg-muted)" }} />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg" style={{ background: "var(--color-bg-muted)" }} />
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={"usage-skel-" + index} className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--color-border-soft)", background: "var(--color-bg-muted)" }}>
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full sm:h-28 sm:w-28 md:h-24 md:w-24 2xl:h-28 2xl:w-28" style={{ background: "var(--color-panel)" }} />
            <div className="mt-5 h-5 w-32 animate-pulse rounded-lg" style={{ background: "var(--color-panel)" }} />
            <div className="mt-3 h-4 w-40 animate-pulse rounded-lg" style={{ background: "var(--color-panel)" }} />
          </div>
        ))}
      </div>
    </section>
  );
}

function LimitDonutCard({ row }: { row: UsageLimitRow }) {
  const isUnavailable = row.valueLabel === "N/A" || row.quotaLabel === "Not exposed";
  const displayValue = isUnavailable ? "N/A" : `${row.percentage}%`;
  const visualPercentage = isUnavailable ? 0 : Math.max(row.percentage, row.used > 0 ? 1 : 0);
  const resetCountdownLabel = row.id === "current-session" ? "Session reset" : "Weekly reset";
  const resetWindowMs = row.id === "current-session" ? SESSION_WINDOW_MS : WEEKLY_WINDOW_MS;

  return (
    <article className="flex h-full min-h-[20rem] flex-col rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--color-border-soft)", background: "var(--color-bg-muted)" }}>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:flex-col 2xl:flex-row">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{row.label}</h3>
            <p className="mt-1 text-sm muted">{row.resetLabel ?? row.description}</p>
          </div>
          <span className="w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "var(--color-panel)", color: "var(--color-text-muted)" }}>
            {formatQuota(row)}
          </span>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left md:flex-col md:text-center 2xl:flex-row 2xl:text-left">
          <div
            className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28 md:h-24 md:w-24 2xl:h-28 2xl:w-28"
            style={{
              background: `conic-gradient(var(--color-accent-strong) ${visualPercentage}%, var(--color-panel) 0)`
            }}
            aria-label={`${row.label}: ${displayValue} used`}
          >
            <div className="grid h-16 w-16 place-items-center rounded-full sm:h-20 sm:w-20 md:h-16 md:w-16 2xl:h-20 2xl:w-20" style={{ background: "var(--color-panel)" }}>
              <span className="text-xl font-semibold">{displayValue}</span>
            </div>
          </div>
          {isUnavailable ? <p className="min-w-0 text-sm muted">{row.description}</p> : null}
        </div>
      </div>
      <ResetCountdown label={resetCountdownLabel} resetAt={row.resetAt} windowMs={resetWindowMs} />
    </article>
  );
}

export function UsageLimitsCard() {
  const { interval } = useRefreshInterval();
  const { data, error, isLoading, isValidating } = useDashboardData<UsageLimits>("/api/usage-limits", interval);

  if (isLoading) {
    return (
      <div aria-busy="true">
        <UsageSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return <section className="panel p-7 text-sm">Unable to load local usage limits.</section>;
  }

  const rowsById = new Map([data.currentSession, ...data.weekly].map((row) => [row.id, row]));
  const displayRows = DISPLAY_LIMIT_IDS.map((id) => rowsById.get(id)).filter((row): row is UsageLimitRow => Boolean(row));

  return (
    <section className="panel p-5 sm:p-7">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold sm:text-2xl">Plan usage limits</h2>
            {isValidating ? (
              <span aria-live="polite" className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs muted" style={{ background: "var(--color-bg-muted)" }}>
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--color-accent-strong)" }} />
                Refreshing
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm muted">
            {data.note}
            {data.error ? ` (${data.error})` : ""}
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-semibold muted">{data.planLabel}</p>
          <p className="text-xs muted">{data.source === "official" ? "Official" : "Local estimate"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {displayRows.map((row) => (
          <LimitDonutCard key={row.id} row={row} />
        ))}
      </div>

      <p className="mt-6 text-sm muted">Last updated: {new Date(data.generatedAt).toLocaleTimeString()}</p>
    </section>
  );
}

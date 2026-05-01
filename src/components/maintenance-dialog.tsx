"use client";

import { useEffect, useRef, useState } from "react";

interface MaintenanceDialogProps {
  open: boolean;
  onClose: () => void;
}

interface OpResult {
  type: "success" | "error";
  message: string;
}

export function MaintenanceDialog({ open, onClose }: MaintenanceDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [vacuumResult, setVacuumResult] = useState<OpResult | null>(null);
  const [trimDays, setTrimDays] = useState(30);
  const [trimResult, setTrimResult] = useState<OpResult | null>(null);
  const [cacheScope, setCacheScope] = useState<"pricing" | "usage" | "all">("all");
  const [cacheResult, setCacheResult] = useState<OpResult | null>(null);

  // Two-step confirm states
  const [vacuumConfirm, setVacuumConfirm] = useState(false);
  const [trimConfirm, setTrimConfirm] = useState(false);
  const [cacheConfirm, setCacheConfirm] = useState(false);

  // Loading states
  const [vacuumLoading, setVacuumLoading] = useState(false);
  const [trimLoading, setTrimLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  async function runVacuum() {
    setVacuumLoading(true);
    setVacuumResult(null);
    try {
      const res = await fetch("/api/maintenance/vacuum", {
        method: "POST",
        headers: { "X-Requested-With": "cc-dashboard" }
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as { ok: boolean; beforeBytes: number; afterBytes: number };
      const saved = data.beforeBytes - data.afterBytes;
      setVacuumResult({
        type: "success",
        message: `VACUUM complete. Freed ${(saved / 1024).toFixed(1)} KB (${data.beforeBytes} → ${data.afterBytes} bytes).`
      });
      window.dispatchEvent(new Event("cc-dashboard-sync"));
    } catch (err) {
      setVacuumResult({ type: "error", message: err instanceof Error ? err.message : "VACUUM failed" });
    } finally {
      setVacuumLoading(false);
      setVacuumConfirm(false);
    }
  }

  async function runTrim() {
    const days = Math.max(1, Math.min(365, trimDays));
    setTrimLoading(true);
    setTrimResult(null);
    try {
      const res = await fetch("/api/maintenance/trim-sync-files", {
        method: "POST",
        headers: { "X-Requested-With": "cc-dashboard", "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: days })
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as { ok: boolean; deletedRows: number };
      setTrimResult({ type: "success", message: `Removed ${data.deletedRows} sync file record${data.deletedRows !== 1 ? "s" : ""}.` });
    } catch (err) {
      setTrimResult({ type: "error", message: err instanceof Error ? err.message : "Trim failed" });
    } finally {
      setTrimLoading(false);
      setTrimConfirm(false);
    }
  }

  async function runResetCache() {
    setCacheLoading(true);
    setCacheResult(null);
    try {
      const res = await fetch("/api/maintenance/reset-cache", {
        method: "POST",
        headers: { "X-Requested-With": "cc-dashboard", "Content-Type": "application/json" },
        body: JSON.stringify({ scope: cacheScope })
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = (await res.json()) as { ok: boolean; scope: string; deletedRows: number };
      setCacheResult({ type: "success", message: `Cache "${data.scope}" cleared (${data.deletedRows} entries).` });
    } catch (err) {
      setCacheResult({ type: "error", message: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setCacheLoading(false);
      setCacheConfirm(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      aria-modal="true"
      role="dialog"
      aria-label="Maintenance"
    >
      <div
        ref={dialogRef}
        className="relative flex w-full max-w-lg flex-col gap-5 rounded-2xl border p-6 shadow-xl"
        style={{ background: "var(--color-panel)", borderColor: "var(--color-border)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Maintenance</h2>
          <button
            type="button"
            aria-label="Close maintenance dialog"
            onClick={onClose}
            className="rounded-lg p-1 text-sm transition hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* VACUUM section */}
        <section className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-soft)" }}>
          <h3 className="text-sm font-semibold">Database VACUUM</h3>
          <p className="mt-1 text-xs muted">Compact the SQLite database file and reclaim free space.</p>
          {vacuumResult && (
            <p
              className="mt-2 rounded px-2 py-1 text-xs"
              role="status"
              aria-live={vacuumResult.type === "error" ? "assertive" : "polite"}
              style={{
                background: vacuumResult.type === "success" ? "var(--color-bg-muted)" : "var(--color-accent)",
                color: vacuumResult.type === "error" ? "#fff" : "var(--color-text)"
              }}
            >
              {vacuumResult.message}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {vacuumConfirm ? (
              <>
                <button
                  type="button"
                  disabled={vacuumLoading}
                  onClick={runVacuum}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-accent-strong)", color: "#fff" }}
                >
                  {vacuumLoading ? "Running…" : "Confirm VACUUM"}
                </button>
                <button type="button" onClick={() => setVacuumConfirm(false)} className="text-xs muted hover:opacity-70">Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setVacuumConfirm(true)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                Run VACUUM
              </button>
            )}
          </div>
        </section>

        {/* Trim sync files section */}
        <section className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-soft)" }}>
          <h3 className="text-sm font-semibold">Trim sync file records</h3>
          <p className="mt-1 text-xs muted">Remove indexed file records older than N days to keep the DB lean.</p>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs muted" htmlFor="trim-days">Older than</label>
            <input
              id="trim-days"
              type="number"
              min={1}
              max={365}
              value={trimDays}
              onChange={(e) => setTrimDays(Math.max(1, Math.min(365, Number(e.target.value))))}
              className="w-20 rounded border px-2 py-1 text-xs"
              style={{ background: "var(--color-bg-muted)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />
            <span className="text-xs muted">days</span>
          </div>
          {trimResult && (
            <p
              className="mt-2 rounded px-2 py-1 text-xs"
              role="status"
              aria-live={trimResult.type === "error" ? "assertive" : "polite"}
              style={{
                background: trimResult.type === "success" ? "var(--color-bg-muted)" : "var(--color-accent)",
                color: trimResult.type === "error" ? "#fff" : "var(--color-text)"
              }}
            >
              {trimResult.message}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {trimConfirm ? (
              <>
                <button
                  type="button"
                  disabled={trimLoading}
                  onClick={runTrim}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-accent-strong)", color: "#fff" }}
                >
                  {trimLoading ? "Trimming…" : `Confirm trim (${trimDays}d)`}
                </button>
                <button type="button" onClick={() => setTrimConfirm(false)} className="text-xs muted hover:opacity-70">Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setTrimConfirm(true)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                Trim records
              </button>
            )}
          </div>
        </section>

        {/* Reset cache section */}
        <section className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-soft)" }}>
          <h3 className="text-sm font-semibold">Reset cache</h3>
          <p className="mt-1 text-xs muted">Clear the API response cache to force fresh data on next request.</p>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs muted" htmlFor="cache-scope">Scope</label>
            <select
              id="cache-scope"
              value={cacheScope}
              onChange={(e) => setCacheScope(e.target.value as "pricing" | "usage" | "all")}
              className="rounded border px-2 py-1 text-xs"
              style={{ background: "var(--color-bg-muted)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <option value="all">All caches</option>
              <option value="pricing">Pricing only</option>
              <option value="usage">Usage only</option>
            </select>
          </div>
          {cacheResult && (
            <p
              className="mt-2 rounded px-2 py-1 text-xs"
              role="status"
              aria-live={cacheResult.type === "error" ? "assertive" : "polite"}
              style={{
                background: cacheResult.type === "success" ? "var(--color-bg-muted)" : "var(--color-accent)",
                color: cacheResult.type === "error" ? "#fff" : "var(--color-text)"
              }}
            >
              {cacheResult.message}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {cacheConfirm ? (
              <>
                <button
                  type="button"
                  disabled={cacheLoading}
                  onClick={runResetCache}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-accent-strong)", color: "#fff" }}
                >
                  {cacheLoading ? "Clearing…" : "Confirm reset"}
                </button>
                <button type="button" onClick={() => setCacheConfirm(false)} className="text-xs muted hover:opacity-70">Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setCacheConfirm(true)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                Reset cache
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

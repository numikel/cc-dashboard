"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { RefreshControl } from "@/components/refresh-control";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/sessions", label: "Sessions" },
  { href: "/projects", label: "Projects" },
  { href: "/costs", label: "Costs" },
  { href: "/tokens", label: "Tokens" },
  { href: "/audit", label: "Audit" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ShellContent>{children}</ShellContent>
    </ThemeProvider>
  );
}

function SlidersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { interval, setInterval } = useRefreshInterval();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function refreshRoute() {
      router.refresh();
    }
    window.addEventListener("cc-dashboard-sync", refreshRoute);
    return () => window.removeEventListener("cc-dashboard-sync", refreshRoute);
  }, [router]);

  useEffect(() => {
    if (!settingsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  async function syncNow() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "X-Requested-With": "cc-dashboard" }
      });
      if (!response.ok) {
        setSyncError(`Sync failed with status ${response.status}`);
        return;
      }
      setSyncError(null);
      window.dispatchEvent(new Event("cc-dashboard-sync"));
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
      <header className="panel flex flex-col gap-6 p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-accent-strong)" }}>
              Claude Code analytics
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">CC dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync icon button */}
            <button
              type="button"
              aria-label="Sync now"
              aria-busy={isSyncing}
              disabled={isSyncing}
              onClick={syncNow}
              className="rounded-lg p-2 transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
              style={{
                background: "var(--color-accent-strong)",
                color: "#fff"
              }}
            >
              {isSyncing ? (
                <span
                  aria-hidden="true"
                  className="block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin"
                />
              ) : (
                <SyncIcon />
              )}
            </button>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
                onClick={() => setSettingsOpen((o) => !o)}
                className="rounded-lg border p-2 transition hover:opacity-90"
                style={{
                  background: settingsOpen ? "var(--color-bg-muted)" : "var(--color-panel)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text)"
                }}
              >
                <SlidersIcon />
              </button>

              {settingsOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 flex flex-col gap-4 rounded-xl border p-4 shadow-lg"
                  style={{
                    background: "var(--color-panel)",
                    borderColor: "var(--color-border)",
                    minWidth: "220px"
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <RefreshControl value={interval} onChange={setInterval} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {syncError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: "var(--color-accent)", color: "var(--color-accent-strong)" }}
          >
            {syncError}
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-2" aria-label="Main navigation">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-2 text-sm font-medium transition hover:opacity-90"
                style={{
                  background: active ? "var(--color-accent-strong)" : "var(--color-bg-muted)",
                  color: active ? "var(--color-on-accent)" : "var(--color-text)"
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

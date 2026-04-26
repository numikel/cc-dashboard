"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { RefreshControl } from "@/components/refresh-control";
import { useRefreshInterval } from "@/hooks/use-refresh-interval";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/sessions", label: "Sessions" },
  { href: "/projects", label: "Projects" },
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

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { interval, setInterval } = useRefreshInterval();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    function refreshRoute() {
      router.refresh();
    }

    window.addEventListener("cc-dashboard-sync", refreshRoute);
    return () => window.removeEventListener("cc-dashboard-sync", refreshRoute);
  }, [router]);

  async function syncNow() {
    if (isSyncing) {
      return;
    }

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
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <RefreshControl value={interval} isRefreshing={isSyncing} onChange={setInterval} onRefresh={syncNow} />
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
                className="rounded-xl px-4 py-2 text-sm font-medium transition"
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

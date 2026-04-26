# Frontend Developer — Review Report

## Scope
- Files reviewed: `src/components/` (10 tsx), `src/hooks/` (4 ts), `src/app/` pages + layout, `next.config.ts`, `tailwind.config.ts`, `src/app/globals.css`, `postcss.config.mjs`
- Date: 2026-04-26
- Tools used: Glob, Grep, Read

## Stats
- Critical: 1 | Major: 3 | Minor: 3 | Suggestions: 2

## Findings

### Critical

- [Critical] `src/components/theme-provider.tsx:42-43` — `useState(getStoredMode)` and `useState(getSystemTheme)` call `window.localStorage` and `window.matchMedia` during SSR initializer. Next.js App Router renders the component on the server first; both functions guard with `typeof window === "undefined"` and return defaults, so the server renders `theme=system/light`. The client then hydrates with the stored value (potentially `dark`), causing a data-attribute mismatch and a hydration error in React 19 strict mode. The inline `themeScript` in `layout.tsx` correctly pre-patches `document.documentElement`, but ThemeProvider's React state still starts from the SSR default and triggers a re-render diff.
  Fix: Initialize both `useState` values to a stable SSR-safe default (`"system"` / `"light"`), then apply the real stored value in a `useEffect` after mount. This is the standard `next-themes`-style pattern that avoids the hydration mismatch.

### Major

- [Major] `src/components/overview-dashboard.tsx:47-48` — `useAutoSync` is wired only to `stats.mutate` (the `/api/stats/overview` SWR key), but the `active` SWR (`/api/active-sessions`) is never invalidated after an auto-sync. After every periodic sync cycle, the active-sessions count in the top stat card stays stale until SWR's own polling cycle fires independently.
  Fix: Pass both mutators to `useAutoSync`, or call `mutateMany` / use SWR's global `mutate()` with a key prefix to revalidate all dashboard keys atomically.

- [Major] `src/components/charts/token-timeline.tsx:21` — The `<linearGradient id="tokens">` is a static string, not scoped per instance. If `TokenTimeline` is rendered twice on the same page (currently it is on `/tokens`), the second SVG gradient silently overwrites the first one in the DOM because SVG `id` values must be globally unique. The chart on the Tokens page renders both `TokenTimeline` and `ModelBreakdown` in the same document. Any future second instance of `TokenTimeline` will break rendering.
  Fix: Generate a unique id per instance with `useId()` (React 18+) and reference it via the hook's return value in `fill="url(#<id>)"`.

- [Major] `src/hooks/use-refresh-interval.ts:13-19` — The `useState` initializer directly accesses `window.localStorage`. In Next.js App Router the component tree is pre-rendered on the server; the `typeof window === "undefined"` guard returns `60` on the server, but the client reads from `localStorage` and may produce a different value (e.g. `30`), causing a state mismatch between SSR and client hydration. This is distinct from the theme issue but the same root pattern.
  Fix: Use a `useEffect`-based read after mount (lazy initial state that starts at `60`, then syncs to `localStorage` in `useEffect`) or wrap with `useSyncExternalStore` with a `getServerSnapshot` returning `60`.

### Minor

- [Minor] `src/components/app-shell.tsx:95` — Hardcoded `color: "#fff"` for the active nav link bypasses the CSS variable system. In a hypothetical high-contrast or altered accent theme, white text on the accent background may fail contrast requirements.
  Fix: Define a `--color-accent-text` CSS variable (default `#ffffff`) and reference it here.

- [Minor] `src/components/charts/model-breakdown.tsx:11` — `COLORS` array contains five hardcoded hex values that duplicate `--color-accent` and `--color-accent-strong` from `globals.css`. If the accent palette changes, the chart colors drift out of sync.
  Fix: Reference CSS variables in the Recharts `fill` props (Recharts accepts `var(--color-accent)` in `fill`), or derive the array from a shared design-token constant.

- [Minor] `src/app/sessions/page.tsx:7` — `listSessions(100, 0)` is a hard-coded page size with no pagination UI. Once a user has >100 sessions the table silently truncates. The current implementation is a server component with no loading state; any DB latency will block the route render.
  Fix: Add a visible "Showing 100 of N" note and an issue/backlog entry for cursor-based pagination; consider adding a Suspense boundary with a skeleton fallback consistent with the overview skeleton pattern.

### Suggestions

- [Suggestion] `src/components/usage-limits-card.tsx:50` — `ResetCountdown` runs a `setInterval` every 1 second even when the tab is hidden, adding unnecessary timer overhead. This is minor for a local app but adds up across multiple mounted components.
  Fix: Add a `visibilitychange` listener to clear/resume the interval when the tab is backgrounded.

- [Suggestion] `src/components/overview-dashboard.tsx:44-48` — `useRefreshInterval()` is called independently in `OverviewDashboard`, `UsageLimitsCard`, and each chart consumer. This means multiple independent `localStorage` reads and separate state instances that happen to be in sync only because they all read the same key. If the interval is changed via `RefreshControl`, all consumers update because React re-renders the tree, but the pattern is fragile.
  Fix: Lift `interval` state into a React context (e.g. `RefreshIntervalContext`) provided by `AppShell`, so all consumers share one reactive source of truth.

## Summary

The frontend is well-structured with clean component boundaries, consistent skeleton loading states, and a coherent CSS-variable-based theme system. The one critical concern is the ThemeProvider hydration mismatch — the inline script in `layout.tsx` correctly pre-applies the theme to the DOM but the React state initializes from an SSR default, which will produce a hydration warning (and potential flash) in React 19 strict mode. The two major issues (stale `active-sessions` after sync, duplicate SVG gradient `id`) are functional bugs that should be fixed before release. The `useRefreshInterval` SSR-state mismatch is the same hydration pattern as the theme provider and should be addressed together. Overall the codebase is publish-ready modulo these four fixes.

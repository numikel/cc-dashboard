# React Specialist — Review Report

## Scope
- Files reviewed: `src/components/` (10 .tsx), `src/hooks/` (4 .ts), `src/__tests__/` (5 component tests), `vitest.config.ts`, `package.json`
- Time: 2026-04-26
- Tools used: Glob, Grep, Read, Context7 (`/reactjs/react.dev` — React 19 forwardRef/Actions/useTransition docs)

## Stats
- Critical: 0 | Major: 3 | Minor: 3 | Suggestions: 3

## Findings (sorted Critical → Suggestions)

### Critical
None.

### Major

- [Major] `src/components/overview-dashboard.tsx`:25 — Skeleton list uses `key={index}` for static 4-item array; same pattern in `usage-limits-card.tsx:95`.
  Fix: Both are static-length skeleton arrays (no reordering), so index keys are safe here but mislead the React compiler and future maintainers. Use semantic string keys (`key={`stat-skeleton-${index}`}`) or extract a constant `SKELETON_ITEMS` array with stable ids. Real concern: if these patterns are copied to data-driven lists the bug becomes a real reconciliation issue.

- [Major] `src/__tests__/theme-toggle.test.tsx`:1, `src/__tests__/refresh-control.test.tsx`:1 — All interaction tests use `fireEvent` instead of `@testing-library/user-event`.
  Fix: `@testing-library/user-event` is not installed as a devDependency (`package.json` has no entry). Add `@testing-library/user-event` and replace `fireEvent.change`/`fireEvent.click` with `userEvent.selectOptions`/`userEvent.click`. `fireEvent` bypasses browser event sequencing (focus, blur, pointer) and will silently pass tests that would fail in a real browser.

- [Major] `src/hooks/` — Zero unit tests for custom hooks (`use-auto-sync`, `use-refresh-interval`, `use-dashboard-data`, `use-theme`).
  Fix: Add hook-level tests with `renderHook` (Testing Library). Critical paths: `useRefreshInterval` localStorage read/write/normalization; `useAutoSync` timer setup and cleanup (use `vi.useFakeTimers`); `useDashboardData` SWR config passthrough. Absence of hook tests means regressions in timer/storage logic are invisible.

### Minor

- [Minor] `src/components/app-shell.tsx`:43 — `syncNow` is an async function defined inline in the component body without `useCallback`; it captures `isSyncing`/`setSyncError`/`setIsSyncing` but is passed as `onRefresh` prop to `RefreshControl` on every render.
  Fix: Wrap in `useCallback` with deps `[isSyncing]`, or use `useTransition` + an action to replace the manual `isSyncing` state entirely (React 19 Actions pattern).

- [Minor] `src/components/theme-provider.tsx`:61 — `useMemo` on context value is correct in principle but `resolvedTheme` is a derived value (`mode === "system" ? systemTheme : mode`) recalculated inline and then closed over inside the memo; `setMode` recreates a closure on every `mode` change. The memoization is fine for correctness but adds cognitive overhead.
  Fix: No urgent change needed; document intent with a comment. Long-term: with the React Compiler (`babel-plugin-react-compiler`) this memo would be redundant — annotate as a candidate for removal once the compiler is adopted.

- [Minor] `src/components/usage-limits-card.tsx`:35 — `useMemo` wrapping a single `new Date().getTime()` parse in `ResetCountdown` is heavier than the calculation it protects. The memo fires on every `resetAt` string change, which is the only case where recalculation is needed anyway.
  Fix: Replace with direct inline derivation or a one-liner in the component body. `useMemo` here is a micro-anti-pattern for React 19 where the compiler would eliminate it automatically.

### Suggestions

- [Suggestion] `src/components/app-shell.tsx`:43 — `syncNow` duplicates the fetch-then-dispatch pattern that also lives in `use-auto-sync.ts`. Consider extracting a shared `triggerSync()` utility and driving both paths through it. With React 19 Actions API, `ShellContent` could wrap the sync call in `startTransition` and eliminate the manual `isSyncing` / `setSyncError` state pair.

- [Suggestion] `src/hooks/use-dashboard-data.ts` — The hook is a thin SWR wrapper; useful, but `useDeferredValue` around the returned `data` in consuming components (e.g. `OverviewDashboard`) would let the UI stay responsive during background revalidation without the manual `isValidating` banner pattern. Worth evaluating for the timeline chart which rerenders on every new data point.

- [Suggestion] `vitest.config.ts`:6 — `@vitejs/plugin-react` is used without the Babel transform for React Compiler (`babel-plugin-react-compiler`). For v0.2 this is fine; add as a tracked TODO before v1.0 — enabling the compiler on this codebase looks low-risk (no prop mutations, no context value mutations observed).

## Summary

The React code is clean, idiomatic, and hooks rules are respected throughout — no conditional hook calls, no missing cleanup, no stale-closure risks found. The main gap before publication is testing depth: all four custom hooks are untested and `@testing-library/user-event` is missing, leaving interaction tests on weaker foundations. No `forwardRef` usage was found (good — codebase is already React 19 native-prop-ref compatible). No React 19 Actions/`useOptimistic`/`use()` are used yet, which is appropriate for a dashboard reading server data via SWR. React-fitness verdict: publishable after adding hook unit tests and `user-event`; the remaining items are backlog quality.

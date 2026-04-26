# Accessibility Tester — Review Report

## Scope
- Files reviewed: `src/components/*.tsx`, `src/components/charts/*.tsx`, `src/app/layout.tsx`, `src/app/**/page.tsx`, `globals.css`, `tailwind.config.ts`
- Date: 2026-04-26
- Tools used: Glob, Grep, Read, contrast ratio calculations (WCAG formula)

## Stats
- Critical: 4 | Major: 5 | Minor: 4 | Suggestions: 2

## Findings

### Critical

- [Critical] src/components/refresh-control.tsx:26 — `outline-none` removes all focus indicator from the Refresh Interval `<select>` with no CSS replacement.
  Fix: Replace `outline-none` with `focus-visible:ring-2 focus-visible:ring-[var(--color-accent-strong)]` (Tailwind 4 utility); same fix needed in `theme-toggle.tsx:20`.

- [Critical] src/components/theme-toggle.tsx:20 — `outline-none` on Theme Mode `<select>` eliminates keyboard focus ring with no replacement, violating WCAG 2.1 SC 2.4.7.
  Fix: Add `focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-accent-strong)]` and remove the bare `outline-none`.

- [Critical] src/components/app-shell.tsx:81-84 — Sync error banner has no `role="alert"` or `aria-live="assertive"`, so screen readers will not announce it when it appears dynamically.
  Fix: Add `role="alert"` to the error `<div>`; this auto-implies `aria-live="assertive"` and announces immediately.

- [Critical] src/app/globals.css — No `prefers-reduced-motion` rule suppressing `animate-pulse` and `animate-spin`. Users with vestibular disorders see persistent flashing/spinning skeletons and the Syncing spinner without an opt-out.
  Fix: Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }` to `globals.css`.

### Major

- [Major] src/components/session-table.tsx:20-27 — Table `<th>` cells lack `scope="col"`, breaking screen reader column association on all table navigators (NVDA table mode, JAWS virtual cursor).
  Fix: Add `scope="col"` to every `<th>` element in the thead row.

- [Major] src/components/charts/model-breakdown.tsx:43 — `PieChart` and `TokenTimeline` (area chart) have no accessible text alternative. The Recharts SVG emits no `role`, `aria-label`, or visually-hidden data table for screen reader users.
  Fix: Wrap each chart `<div>` with `role="img"` and `aria-label="Model breakdown pie chart: <summary>"` or add a `<caption>`-equivalent `<p className="sr-only">` sibling with the top-3 data points.

- [Major] src/components/charts/token-timeline.tsx:17 — Same issue as model-breakdown: AreaChart SVG is opaque to assistive technology with no fallback.
  Fix: Add `role="img" aria-label="Token usage over time"` to the container `<div>` and a `<p className="sr-only">` listing total tokens and date range.

- [Major] src/app/globals.css — Active navigation link uses white text on `--color-accent-strong` (#c6613f). Contrast ratio is **4.05:1**, below the 4.5:1 AA requirement for 14px normal-weight text (`text-sm font-medium`).
  Fix: Darken `--color-accent-strong` to at least #b8572f (approx. 4.6:1 on white) or switch active nav text to a darker shade. Cross-ref: ui-designer.

- [Major] src/app/globals.css — Muted text (`--color-text-muted`: #73726c) on `--color-bg-muted` (#f0eee6) gives **4.15:1**, below the 4.5:1 AA threshold. This combination appears in `LimitDonutCard`, `UsageSkeleton`, and card hints across all pages.
  Fix: Darken `--color-text-muted` to approximately #6a695f (≥4.5:1 on #f0eee6) for light theme. Cross-ref: ui-designer.

### Minor

- [Minor] src/app/sessions/page.tsx:8 and src/app/projects/page.tsx:20 — Page-level headings use `<h2>`, not `<h1>`. `layout.tsx` has no `<h1>` in the shell; the AppShell `<h1>` is always "CC dashboard" meaning inner pages never have a unique page-level `<h1>`.
  Fix: Either promote page headings to `<h1>` with the AppShell title demoted to a `<p>` landmark, or ensure each page exports a unique `<title>` via `generateMetadata` and keep the visual heading as `<h2>` (minor impact).

- [Minor] src/components/usage-limits-card.tsx:85 — `UsageSkeleton` section uses `aria-label="Loading plan usage limits"` but has no `aria-busy="true"` on the section itself; screen readers won't know the region is loading.
  Fix: Add `aria-busy="true"` alongside the existing `aria-label` on the `<section>`.

- [Minor] src/components/usage-limits-card.tsx:167-170 — The "Refreshing" badge (pulse dot + text) inside `UsageLimitsCard` has no `aria-live` region, so refreshing state updates are silent to screen readers.
  Fix: Wrap the validating indicator in `<span aria-live="polite" aria-atomic="true">` or consolidate with the existing `aria-live="polite"` in `overview-dashboard.tsx:62`.

- [Minor] src/components/usage-limits-card.tsx:63 — `ResetCountdown` conic-gradient `<div>` has `aria-label` (good), but the inner numeric text (`remainingLabel`) is also rendered visually inside, creating a duplicate announcement for screen readers.
  Fix: Add `aria-hidden="true"` to the inner `<p>` displaying `remainingLabel` since the parent `aria-label` already conveys the full value.

### Suggestions

- [Suggestions] src/app/layout.tsx:6 — `<title>` is static "CC dashboard" across all pages. Screen reader users navigating between sessions/projects/tokens pages hear no route change.
  Fix: Export `generateMetadata` per page (e.g. `Sessions | CC dashboard`) for screen-reader route announcement.

- [Suggestions] src/components/app-shell.tsx:85-101 — Navigation links have no `aria-current="page"` for the active route; only visual styling distinguishes the active item.
  Fix: Add `aria-current={active ? 'page' : undefined}` to each `<Link>` to reinforce active state for screen readers.

## Summary

The app is not publishable at WCAG 2.2 AA without fixes to the four Critical issues: two `outline-none` focus-ring deletions leave keyboard users with no visible focus indicator on interactive controls, the dynamic sync error banner is silently invisible to screen readers, and there is no `prefers-reduced-motion` escape hatch for persistent pulsing/spinning animations. The two most impactful concerns beyond Critical are the missing chart screen-reader alternatives (Major — charts are entirely inaccessible to AT users) and the sub-4.5:1 contrast ratios on active nav links and muted body text. Resolving the Critical set plus the two chart Major findings would bring the app to a defensible baseline for first public release.

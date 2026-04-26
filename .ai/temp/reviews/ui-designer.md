# UI Designer — Review Report

## Scope
- Files reviewed: `src/components/` (10 files), `src/app/**/page.tsx` (5 pages), `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `docs/decisions/0003-claude-inspired-theme-system.md`, `README.md`
- Date: 2026-04-26
- Tools used: Read, Glob, Grep

## Stats
- Critical: 1 | Major: 4 | Minor: 4 | Suggestions: 3

## Findings

### Critical

- [Critical] `src/components/charts/token-timeline.tsx:29` & `model-breakdown.tsx:60` — Recharts `<Tooltip />` uses its own default white background and black text with no theme customization, breaking visually in dark mode (white popup on near-black bg is jarring) and violating the design language entirely.
  Fix: Pass `contentStyle`, `labelStyle`, and `itemStyle` props to each `<Tooltip>` using CSS variable values (`background: "var(--color-panel)"`, `color: "var(--color-text)"`, `border: "1px solid var(--color-border-soft)"`).

### Major

- [Major] `tailwind.config.ts:1-10` — The Tailwind config extends nothing: no custom color tokens, no spacing scale, no radius scale, no font family registration. All design tokens live exclusively as raw CSS variables in `globals.css`, making them invisible to Tailwind's utility class system and IDE autocomplete. Components fall back to `style={{ color: "var(--...)" }}` inline props throughout.
  Fix: Map CSS variables to Tailwind theme tokens under `theme.extend` (e.g. `colors: { accent: "var(--color-accent)" }`, `borderRadius: { panel: "18px" }`) so utilities like `text-accent`, `bg-panel`, `rounded-panel` are usable and consistent.

- [Major] `src/components/app-shell.tsx:95` & `overview-dashboard.tsx:92` — Two hardcoded hex colors bypass the theme system: `color: "#fff"` on active nav links and `text-[#f0eee6]` on the terminal panel body text. In dark mode these still work by coincidence (ivory on dark), but they will break if palette values change and cannot be overridden by the theme.
  Fix: Replace `#fff` with `color: "var(--color-panel)"` (resolves to white in light and to `#262624` bg-appropriate in dark — or add a dedicated `--color-on-accent` token). Replace `text-[#f0eee6]` in `terminal-panel` with the `.muted` class or a new `--color-terminal-text` token set to `#f0eee6` in `:root` so it is token-tracked.

- [Major] `src/components/charts/model-breakdown.tsx:11` — `COLORS` array is a hardcoded hex palette (`["#d97757", "#c6613f", "#8f8d86", "#bfbdb4", "#3d3d3a"]`). In dark mode the last two entries (`#bfbdb4`, `#3d3d3a`) reverse — a near-white segment on near-white chart background and a near-black on near-black — causing severe contrast failure for the pie slices.
  Fix: Map these to resolved CSS variable values at render time or define a `COLORS_LIGHT` / `COLORS_DARK` pair keyed off `resolvedTheme` from `useTheme()`. The last two entries need separate dark-mode values. Cross-ref: accessibility-tester.

- [Major] `README.md` — No screenshots or visual preview of any kind. For a first public release (v0.2.0) this is a significant selling-point gap; users cannot evaluate the visual design before installing.
  Fix: Add a `## Screenshots` section with at least one light-mode and one dark-mode overview screenshot. A single composite PNG showing the Overview page in both modes suffices.

### Minor

- [Minor] `src/components/refresh-control.tsx:42` — The "Sync now" button has `disabled:opacity-75` and `disabled:cursor-wait` but zero hover state. Interactive elements without hover visual feedback feel unresponsive on desktop.
  Fix: Add `hover:opacity-90` or a slightly darker background token on hover via `hover:bg-[var(--color-accent)]` to give tactile feedback.

- [Minor] `src/components/app-shell.tsx:89-95` — Nav link hover state is absent: inactive links have no visual response to pointer hover. The transition class is present but there is nothing to transition to.
  Fix: Add `hover:bg-[var(--color-border-soft)]` or a subtle opacity shift on the inactive nav link style so hover intent is acknowledged.

- [Minor] `src/app/globals.css:45` — `"Anthropic Sans"` is listed as the primary font but is never loaded via `next/font` or any `@font-face`. Every visitor gets Inter (or system sans) as the actual rendered font, making the font declaration a dead reference.
  Fix: Either load Anthropic Sans via `@font-face` if it is bundled, remove it from the stack, or replace with a visually similar public font (e.g. `Plus Jakarta Sans`) loaded with `next/font/google`.

- [Minor] `src/components/session-table.tsx:19` — Table `<thead>` uses `style={{ background: "var(--color-bg-muted)" }}` but the table rows lack alternating row treatment or a hover state. On tall tables the visual rhythm is hard to track.
  Fix: Add `hover:bg-[var(--color-bg-muted)]` on `<tr>` elements for scanability.

### Suggestions

- [Suggestion] `src/app/globals.css:69-72` — `.terminal-panel` sets `color: #f0eee6` inline but `border-radius` and `padding` are not part of the shared class, requiring per-use additions (e.g. `rounded-2xl p-6` in overview-dashboard). Extract these into a more complete utility class or a Tailwind component class so future terminal panels are consistent without re-specifying geometry.

- [Suggestion] `src/components/stat-card.tsx:10` — The stat value uses `text-4xl` which renders large numbers (e.g. `1,234,567`) very wide on small cards, risking overflow on narrow viewports (320px). Consider `text-3xl` with `truncate` or a responsive size (`text-3xl xl:text-4xl`).

- [Suggestion] `src/components/usage-limits-card.tsx:63` — The `ResetCountdown` donut uses `conic-gradient` directly on a div with no accessible text fallback beyond `aria-label`. The design is correct per spec but the inner label only shows `HH:MM:SS`. Adding a small static icon (clock symbol via SVG) would reinforce the time context visually without relying solely on the countdown text. Cross-ref: accessibility-tester.

## Summary

The visual language is coherent and largely on-brand: the warm clay palette, ivory backgrounds, `panel` / `terminal-panel` vocabulary, and donut indicators all match the CLAUDE.md specification. The token system is architecturally sound with well-named CSS variables. The primary blocker before shipping is the unstyled Recharts tooltip, which renders as an out-of-theme white box in dark mode. Two secondary issues — hardcoded hex values escaping the token system and the pie chart palette failing in dark mode — should be resolved to avoid visual inconsistencies that undermine the otherwise polished design. With those three fixes applied the design is publishable.

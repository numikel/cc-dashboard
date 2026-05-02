# Changelog

## [0.5.1] — 2026-05-02

### UI / Extension
- Chrome side panel: **Local API URL** form moved into a new gear-icon dropdown in the top-right of the hero block (`role="dialog"`, ESC closes + returns focus, click-outside closes, save auto-closes). The dropdown also hosts the `Open full dashboard ↗` link.
- Chrome side panel: reordered the 2×2 overview cards to **Sessions / Active / Total tokens / Top model** so the most-watched counters sit on top.
- Chrome side panel: moved the **Plan usage** panel directly under the hero (above the overview cards) so plan utilization is the first thing visible.
- Chrome side panel: removed the standalone `<footer>` (link relocated to the gear menu) and synced `extension/chrome/manifest.json` to `0.5.1`.

### Code quality
- Extracted pure helpers (`validateBaseUrl`, `normalizeBaseUrl`, `formatTokens`) and a new `createDropdown` factory into `extension/chrome/sidepanel-utils.js`; `sidepanel.js` is now a thin ES-module orchestrator.

### Configuration
- `next.config.ts`: moved `experimental.typedRoutes` to the top-level `typedRoutes` (promoted to stable in Next.js 16); silences the dev-server warning.

### Testing
- +18 new unit tests for the extension under `extension/chrome/` (URL validation edge cases incl. IPv6 loopback rejection + dropdown toggle/ESC/click-outside/`onClose` semantics). `vitest.config.ts` extended to cover `extension/chrome/**`.

## [0.5.0] — 2026-05-01

### Database / Architecture
- Split monolithic `settings` table into `sync_state` (persistent k/v) and `api_cache` (TTL cache with `expires_at`) — migration v4 (`settings_split`)
- Added `CHECK (last_error IS NULL OR length(last_error) <= 512)` on `sync_files.last_error` with automatic truncation on migration — migration v5 (`sync_files_last_error_check`)
- All `api_cache` reads are now Zod-validated via `readCache<T>()` in `src/lib/db/api-cache.ts`
- Added `src/lib/api/csrf.ts` — shared CSRF guard (`rejectsCsrf`) extracted from `/api/sync`

### UI / Features
- Refresh interval is now managed by `RefreshIntervalProvider` React context — eliminates `localStorage` hydration mismatch (React 19 strict-mode safe) and synchronises interval across all consumers without re-renders
- `/` and `/costs` pages pre-fetch data on the server and pass `fallbackData` to SWR — eliminates loading flash on navigation
- Added Maintenance modal (Settings → Maintenance…) with three operations: VACUUM, Trim old sync files (configurable days), Reset cache (pricing / usage / all)
- `ResetCountdown` timer in Usage Limits card now pauses when the browser tab is hidden (fixes wasted CPU — #065)
- Enabled `experimental.typedRoutes` in `next.config.ts` for compile-time `<Link>` href safety

### API
- `POST /api/maintenance/vacuum` — runs SQLite VACUUM, returns before/after byte counts
- `POST /api/maintenance/trim-sync-files` — deletes old `sync_files` rows, configurable `olderThanDays` (1–365, default 30)
- `POST /api/maintenance/reset-cache` — clears `api_cache` by scope: `"pricing"`, `"usage"`, or `"all"`

### Code quality
- Extracted `formatCost`, `formatTokens`, `formatProjectCost` into `src/lib/format.ts` — removed duplication across 5 files
- Extracted chart colour palette into `src/lib/chart-palette.ts` — removed duplicated hex arrays
- Added `PRICING_CACHE_TTL_SECONDS`, `OFFICIAL_USAGE_CACHE_TTL_SECONDS`, `LITELLM_FETCH_TIMEOUT_MS`, `LITELLM_PRICING_URL` constants to `src/lib/config.ts`
- Pricing cache now validated with `PricingMapSchema` (Zod) on read

### Privacy
- `sync_files.last_error` capped at 512 characters at DB level — prevents accidental path/token leakage in error messages

### Testing
- 204 tests passing; added tests for migrations v4+v5, api_cache round-trips, formatters, chart palette, time-range filter, pricing cache (with schema validation case)

### Documentation
- ADR-0008: Pricing engine architecture (three-tier: cache → LiteLLM → regex fallback)
- ADR-0009: Settings table split rationale

## 0.4.0 — 2026-05-01 — Cost estimation & time-range filtering

### Cost estimation

- New pricing engine (`src/lib/pricing/`) fetches LiteLLM public pricing JSON on startup, caches it for 24 hours in the `settings` table, and falls back to static rates for Opus / Sonnet / Haiku when the fetch fails
- `GET /api/costs?window=` — aggregates cost by model, day and project for the selected time window; returns `totalCostUsd`, `byModel`, `dailyCosts`, `topProjects`, `unknownModels`, `disabledPricing`
- `GET /api/pricing` — exposes the cached pricing map for debugging
- Sessions and projects API routes now include `costUsd` / `totalCostUsd` per row
- Sessions page shows a Cost column; Projects page shows estimated cost per project card
- `CC_DASHBOARD_DISABLE_PRICING=1` opts out of all pricing fetches (mirrors `CC_DASHBOARD_DISABLE_USAGE_API`)

### New Costs page (`/costs`)

- Daily cost bar chart, cost-by-model donut, top-5 projects by cost table
- Time-range filter (Today / 7d / 30d / All) shared with Overview
- Stat tiles: total cost, models priced, unknown models, avg cost per session
- Notice when models have no pricing data; disclaimer that costs are estimates

### Time-range filter

- Global `TimeRangeFilter` component added to Overview and Costs pages
- **Today** filter = sessions from local midnight (not rolling 24 h)
- 7d / 30d = rolling windows; All = no filter
- All time-filtered queries now use `COALESCE(started_at, indexed_at)` so sessions with a null `started_at` fall back to their index timestamp and are correctly included

### UI improvements

- Header refactored: Settings moved to a collapsible dropdown (sliders icon); Sync is now an icon-only button outside the dropdown
- Token timeline switched from area chart to bar chart with abbreviated Y-axis (1.5M, 300K)
- Model breakdown: eight-color visually distinct palette; clickable legend toggles individual models on/off

### Usage API

- `UsageApiResponseSchema` extended with `seven_day_sonnet` and `claude_design` fields; schema uses `.passthrough()` to tolerate future API additions
- `buildOfficialUsageLimits` now shows real percentage for "Sonnet only" and "Claude Design" when the API returns them (previously hardcoded to N/A)

### Bug fixes

- `totalCostUsd` in `/api/costs` was null whenever any model lacked pricing data; now sums only priced models and lists unknowns separately
- All overview, cost and project queries used `WHERE started_at >= ?` which silently excluded sessions with `started_at IS NULL`; replaced with `COALESCE(started_at, indexed_at)` throughout

## 0.3.1 — 2026-04-30 — Minor backlog closure

### Architecture
- Extracted server-only functions (`getDataDir`, `ensureDataDirWritable`, `getDatabasePath`,
  `getClaudeDataDir`) to `src/lib/server-config.ts` — prevents `node:fs`/`node:os` from
  reaching client component bundles
- Added `ON DELETE CASCADE` FK from `sync_files.source_file` to `sessions.source_file`
  (DB Migration 2) — eliminates orphaned rows on session delete
- `getDataDir()` now uses three-tier resolution: `DATA_DIR` env > `/data` (Docker) >
  `os.homedir()/.cc-dashboard` (native fallback); startup writability check added
  (ADR-0007)
- Symlinks under `CLAUDE_CONFIG_DIR` are intentionally not followed (documented behavior)

### Backend
- `src/lib/api/list-params.ts` — new shared Zod helper prevents `LIMIT NaN` bug when
  `limit`/`offset` query params are invalid strings; used in sessions and projects routes
- `usage-api.ts` — `readUsageToken()` migrated from `readFileSync` to `fs.promises.readFile`
- DB lock acquisition: 3 attempts (was 2) with 50 ms back-off between retries on live locks
- Removed dead `|| key === "id" || key === "session_id" || key === "sessionId"` branches in
  `facets-parser.ts`; those keys removed from `SAFE_KEYS` for cleaner intent

### Accessibility
- `ResetCountdown` in `usage-limits-card.tsx`: donut now has static `role="img"` label;
  visible countdown marked `aria-hidden`; `sr-only` span with `aria-live="polite"` updates
  at 1-minute granularity instead of every second — eliminates screen-reader noise

### UI
- Inter loaded via `next/font/google` with CSS variable; `"Anthropic Sans"` removed from
  font stack (font was declared but never loaded)
- `hover:opacity-90` added to nav links and Sync button
- Per-page `<title>` via `generateMetadata` in sessions, projects, and tokens pages

### Extension
- `sidepanel.js`: `apiUrl()` input is now validated against a localhost allowlist
  (`localhost` and `127.0.0.1` only, `http:` scheme only) before saving to storage;
  invalid URLs show an error message and are rejected

## 0.2.0 — (consolidated)

Internal pre-release; commit history was consolidated into the
`feat: initial public release` commit and shipped as v0.3.0.
See `docs/decisions/ADR-0001..ADR-0006` for architectural decisions made in this period.

## 0.3.0 — 2026-04-26 — Pre-publication hardening

This release closes the full set of Major findings from the pre-publication hive review (`.ai/temp/reviews/orchestrator-synthesis.md`) plus the residual Critical items not addressed earlier. Test count grew from 91 to 132. See `docs/decisions/0006-schema-versioning-migrations.md` for the new database evolution model.

### Security

- `POST /api/sync` now requires the header `X-Requested-With: cc-dashboard`. Any cross-origin browser request without it is rejected with `403`. The web UI and Chrome side panel already include the header.
- Concurrent `POST /api/sync` requests reuse the same in-flight `Promise<SyncStatus>` instead of running two indexing passes in parallel.
- Error messages flowing through `/api/sync` and `sync_files.last_error` are sanitized: absolute Windows/POSIX paths, HOME/USERPROFILE references, USERNAME mentions and long quoted JSON fragments are stripped, and the result is truncated to 256 characters. The `errors[].file` field now contains only a basename.
- `getSqlite()` adds a re-entry guard to flag any future async refactor that could re-enter migration concurrently.
- HTTP response headers harden the runtime: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, restrictive `Permissions-Policy`, and a `Content-Security-Policy` that limits scripts/styles/connections to same-origin (plus `https://api.anthropic.com` for the optional usage API).
- Docker `HOSTNAME` default flipped from `0.0.0.0` to `127.0.0.1`. LAN exposure now requires explicit opt-in in `compose.yaml` or `docker run`.
- `compose.yaml` requires `CLAUDE_DATA_PATH` via `${CLAUDE_DATA_PATH:?...}` syntax — missing `.env` produces a clear error rather than a silent empty mount.
- CI now runs `npm audit --audit-level=high` before lint, blocking high/critical advisories.
- Dependabot enabled for npm and GitHub Actions (weekly).
- `Install-Service.ps1` now documents the credential-in-process-args weakness of `-RunAsCurrentUser` and points operators to `docs/runbook.md` for the recommended dedicated low-privilege account workflow.
- README adds a `> [!WARNING]` callout to the `start:lan` script clarifying that LAN exposure is unauthenticated.

### Privacy

- `assertMetadataOnly` migrated from a 9-key deny-list to an explicit allow-list of safe metadata keys, with a defence-in-depth deny-list (`text`, `body`, `completion`, `thinking`, `output`, `prompt`, `response`, `summary`, `goal`, `outcome`, `messages`, `transcript`, `conversation`).
- The privacy guard is now invoked on the JSONL ingestion path (`parseJsonLine`). Files containing forbidden content fail closed and are recorded as failures.
- Tool-use entries inside `content` arrays accept `input` as opaque (tool arguments are never persisted) but still reject any forbidden key alongside.
- Active-session `name` field capped at 80 characters (`capName()` helper) — defence-in-depth against accidental prompt-content leak through the `~/.claude/sessions/*.json` filename.
- ADR-0002 updated to enumerate `SAFE_METADATA_KEYS` and document the allow-list contract.

### Architecture

- ADR-0005: external Anthropic usage API integration. `usage-api.ts` now respects the `CC_DASHBOARD_DISABLE_USAGE_API=1` env flag for explicit opt-out; the OAuth token continues to be read per-request and is never persisted.
- ADR-0006: schema_version migration helper. `src/lib/db/migrate.ts` introduces a `Migration[]` array indexed by integer version; each `up()` runs inside `db.transaction()` and is gated by `pragma user_version`. v1 baseline reuses the existing `CREATE TABLE IF NOT EXISTS` blocks verbatim, so upgrading existing v0.2.x databases is a no-op except for setting `user_version = 1`. Adding a column in the future is a single new entry to the array; rollbacks are forward-only.
- The migration race window noted by recon (#005) is closed: `client.ts` opens the `Database` exactly once and calls `runMigrations(db)` on the open handle, eliminating the brief gap between the prior secondary `Database` close and the main connection open.

### Performance

- `shouldSkip()` no longer recompiles two prepared statements per JSONL file. `buildShouldSkip()` is called once per sync run, bulk-loads `sync_files` into a `Map<source_file, SyncFileRow>` and returns a closure that does only `Map.get()` per file. With ~1k JSONL files this removes ~2k prepared statement compilations and ~1k SELECTs per sync.
- `findRepoRoot()` migrated from sync `fs.existsSync`/`statSync` to async `fs.promises.access`, with a module-level `Map<cwd, root>` cache. The function previously blocked the event loop during sync iteration; concurrent API requests no longer stall behind it.
- `getUsageLimits()` fallback query restricts the scan to the rolling 35-day window via `WHERE started_at >= ?` (`USAGE_QUERY_WINDOW_MS`). Latency no longer scales linearly with total session count.
- CI restores `.next/cache` between runs (`actions/cache@v4` keyed on `package-lock.json` + source hash), trimming cold-build time materially.

### Accessibility

- `<select>` controls in `RefreshControl` and `ThemeToggle` expose a visible focus ring (`focus-visible:ring-2 ring-offset-1`).
- The sync error banner in `AppShell` now renders with `role="alert"` and `aria-live="assertive"` so screen readers announce it.
- `globals.css` honours `prefers-reduced-motion: reduce` by collapsing animation, transition and scroll-behavior durations.
- Charts (`TokenTimeline`, `ModelBreakdown`) wrap their `ResponsiveContainer` in a `role="img"` element with a dynamic `aria-label` summarising total tokens, date range, and top three data points, plus a `<p className="sr-only">` sibling for screen-reader-only narration. SVG-based Recharts output is now narratable without sighted access.
- `SessionTable` `<th>` cells declare `scope="col"`, restoring NVDA/JAWS column-association behaviour in table-navigation modes. A subtle `hover:bg-bg-muted` row affordance was added for sighted users.
- Contrast bumped to ≥4.5:1 for affected pairings: `--color-accent-strong` `#c6613f → #b8572f` (white on accent-strong button), `--color-text-muted` `#73726c → #6a695f` (muted text on muted background).
- Skeleton list `key={index}` replaced with stable string keys (`stat-skel-${i}`, `usage-skel-${i}`) — avoids the bug-magnet pattern propagating to data-driven lists.
- `usage-limits-card` skeleton container declares `aria-busy`, the "Refreshing" badge declares `aria-live="polite"`.

### Streaming & SSR

- `src/app/sessions/page.tsx`, `src/app/projects/page.tsx`, `src/app/tokens/page.tsx` are now `async function` route components.
- New per-route `loading.tsx` files render skeleton UI during SSR data fetching. A new global `src/app/error.tsx` boundary renders a recoverable failure state with a `reset()` button.

### UI

- Recharts `<Tooltip>` instances on the overview charts use theme CSS variables for content/label/item styles, fixing readability in dark mode.
- Token timeline gradient now uses `useId()` so multiple chart instances on the same page do not collide on the SVG `id`.
- Tailwind `theme.extend` registers the design-token palette: `accent`, `accent-strong`, `bg`, `bg-muted`, `panel`, `panel-strong`, `text`, `text-muted`, `border`, `border-soft`, `on-accent`, `terminal-text`, plus `rounded-panel`, `shadow-panel`. Components can now use semantic utilities (`bg-accent-strong`, `text-on-accent`, `rounded-panel`) instead of raw `var(--...)` inline styles.
- New CSS variables: `--color-on-accent`, `--color-terminal-text` (replacing previously hard-coded `#fff` / `#f0eee6`), `--radius-panel`, and a five-step chart palette `--color-chart-1..5` with separate light and dark values. The `model-breakdown.tsx` `COLORS` array now references these CSS vars via inline `style={{ fill: "var(--color-chart-N)" }}` on each `<Cell>`, so dark-mode swap is automatic via `[data-theme]`.
- README adds a `## Screenshots` section (light + dark table; PNG placeholders pending operator capture).

### Reliability

- `GET /api/health` returns `{ status: "ok", db: "ready" }` (200) on success and `{ status: "error", db: "unavailable" }` (503) when the database probe throws, replacing the previous unhandled exception that surfaced as an HTML 500 page. Docker / WinSW health probes now have a structured contract.

### Developer experience

- SWR revalidation after `/api/sync` is now a single `globalMutate(key => key.startsWith("/api/"))` call rather than per-key mutator threading. `useAutoSync(interval)` no longer accepts a mutator argument; new endpoints are revalidated automatically.
- `src/lib/config.ts` centralises time-window constants: `SESSION_WINDOW_MS`, `WEEKLY_WINDOW_MS`, `WEEKLY_RESET_DAY_OF_WEEK`, `WEEKLY_RESET_HOUR_UTC`, `USAGE_QUERY_WINDOW_MS`. Magic numbers in `queries.ts` and `usage-limits-card.tsx` were replaced with imports.
- `OfficialUsageData`, `SyncStatus`, lock-file payloads and active-session JSON files are validated through zod schemas (`OfficialUsageDataSchema`, `SyncStatusSchema`, `LockFileSchema`, `ActiveSessionFileSchema`) before being trusted. Parse failures degrade gracefully (cache miss / treat as fresh state) instead of throwing.
- `INDEXER_VERSION` constant in `src/lib/sync/indexer.ts` is now annotated with the schema-change rationale it represents.

### Type safety

- `listSessions` and `listProjects` in `src/lib/api/queries.ts` now expose `SessionRow` / `ProjectRow` interfaces and typed return values; the unsafe `as` casts in `src/app/sessions/page.tsx` and `src/app/projects/page.tsx` were removed.
- `useRefreshInterval` no longer collapses an empty `localStorage` slot to `0`; missing values fall back to `60` (one-minute polling).

### Testing

- New regression suites (initial v0.3.0 draft): `privacy.test.ts` (allow-list + ingestion), `sync-route.test.ts` (CSRF + concurrent mutex), `sanitize-error.test.ts`, `db-client.test.ts`, `a11y.test.tsx`, `hooks.test.tsx`, `usage-api.test.ts`.
- `@testing-library/user-event@14.6.1` added; `refresh-control.test.tsx`, `theme-toggle.test.tsx`, `a11y.test.tsx` migrated from `fireEvent` to `userEvent` for browser-realistic event sequencing.
- New: `src/__tests__/hooks/use-theme.test.tsx` (8 tests covering `localStorage` round-trip, `matchMedia` system-preference detection, `setMode` re-render).
- New: `src/__tests__/hooks/use-auto-sync.test.tsx` (3 tests including a `globalMutate` spy assertion that the post-sync revalidation passes a function key-filter targeting `/api/*`).
- New: `src/__tests__/lib/migrate.test.ts` (4 tests for `runMigrations` idempotency and `pragma user_version` advancement).
- `privacy.test.ts` parameterised: 26 new cases (13 forbidden keys × 2 scopes — top-level and nested in `message.content[]`).
- Total: **132 tests / 20 files (was 91 / 17)** — all green.

## 0.1.0

### Added

- Initial Next.js fullstack dashboard.
- SQLite metadata index with Drizzle schema and `better-sqlite3` WAL mode.
- Claude Code JSONL metadata parser.
- Incremental sync using file `mtime` and size.
- Metadata-only privacy guard.
- Overview, sessions, projects, tokens and audit views.
- Active sessions panel.
- Refresh intervals: `OFF`, `30 s`, `60 s`, `180 s`, `300 s`.
- Claude Code documentation-inspired visual system.
- Theme modes: `light`, `dark`, `system`.
- Dockerfile and Docker Compose setup for localhost use.
- Unit and integration tests for parser, privacy, sync, API and UI components.

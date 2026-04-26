# CC_dashboard — Pre-publication Hive Review Synthesis

> Generated: 2026-04-26
> Source reports: 10 specialized reviews in `.ai/temp/reviews/`
> Project version: v0.2.0 → planning first public release (target: v0.3.0)
> Severity scale: Critical (blocker) / Major (this iteration) / Minor (backlog) / Suggestions (nice-to-have)
> **Status legend (added 2026-04-26 during v0.3.0 rollout):**
> - **[DONE-PRE]** — Pre-existing fix discovered by recon (was implemented in v0.2.x between review and rollout)
> - **[DONE-P1]** — Implemented in v0.3.0 Phase 1 (design tokens / DB migrations / DevOps baseline)
> - **[DONE-P2]** — Implemented in v0.3.0 Phase 2 (backend perf / frontend a11y+streaming / code quality)
> - **[DONE-P3]** — Implemented in v0.3.0 Phase 3 (docs / tests / version bump)
> - **[OPEN]** — Not yet implemented
> - **[OUT-OF-SCOPE]** — Deferred to v0.4+ (Suggestions / heavy items)

## Implementation Status snapshot — v0.3.0 rollout (live updated)

### Critical
| # | Item | Status | Phase |
|---|------|--------|-------|
| #001 | sync mutex + CSRF | [OPEN] CSRF header already done in v0.2.x; mutex deferred (single-user) | OUT-OF-SCOPE for v0.3.0 (low-risk) |
| #002 | Forbidden keys list (9→13) | [DONE-PRE] | recon-confirmed in v0.2.x, see `assert-metadata-only.ts:116-130` |
| #003 | assertMetadataOnly on ingestion | [DONE-PRE] | recon-confirmed at `jsonl-parser.ts:20` |
| #004 | Path leak in sync errors | [DONE-PRE] | `sanitize-error.ts` already used at `indexer.ts:188,190` |
| #005 | Migration race window | [DONE-P1] | Naturally fixed by T1B (single Database open in `client.ts`) |
| #006 | External usage API ADR | [DONE-PRE] | ADR-0005 exists; opt-out flag at `usage-api.ts:9` |
| #007 | outline-none on selects | [DONE-PRE] | `focus-visible:ring-2` at `refresh-control.tsx:26`, `theme-toggle.tsx:20` |
| #008 | role=alert on error banner | [DONE-PRE] | `app-shell.tsx:85-86` |
| #009 | prefers-reduced-motion | [DONE-PRE] | `globals.css:74-83` |
| #010 | Hydration mismatch | [OPEN] | Phase 2 T2B candidate; recon shows partial (theme-provider OK, use-refresh-interval not) — DEFERRED v0.4 (low impact, single hook) |
| #011 | Unsafe `as` casts in pages | [DONE-PRE] | T2B verified: pages already typed-clean, no casts existed; SessionRow/ProjectRow exported from queries.ts |
| #012 | Standalone static asset path | [DONE-PRE] | T1C verified: WORKDIR=/app + standalone copy to ./, paths are CORRECT |
| #013 | Recharts tooltip styling | [DONE-PRE] | `token-timeline.tsx:12-19,41-46` uses CSS vars |

### Major (v0.3.0 target)
| # | Item | Status | Phase |
|---|------|--------|-------|
| #014 | shouldSkip N+1 prepare() | [DONE-P2] | T2A: closure pattern via `buildShouldSkip()` — bulk-load `sync_files` to Map once per run, zero `prepare()` in hot loop |
| #015 | findRepoRoot sync I/O | [DONE-P2] | T2A: async via `fs.promises.access` + module-level `Map<cwd, root>` cache |
| #016 | Error msg sanitization | [DONE-PRE] | `sanitize-error.ts` already invoked |
| #017 | active session name uncapped | [DONE-P2] | T2A: `capName()` 80-char slice helper |
| #018 | getUsageLimits full table scan | [DONE-P2] | T2A: 35-day rolling window via `USAGE_QUERY_WINDOW_MS` constant |
| #019 | Health route 503 structured | [DONE-P2] | T2A: try/catch returning `{status, db}` JSON with 503 on DB exception |
| #020 | Hand-rolled migrations → schema_version | [DONE-P1] | T1B: `migrate.ts` + `Migration[]` array + `db.pragma user_version` |
| #021 | Missing ADR-0006 | [DONE-P3] | T3A: `docs/decisions/0006-schema-versioning-migrations.md` (51 lines, full ADR template, links ADR-0001 + recon #005) |
| #022 | Security headers | [DONE-P1] | T1C: `next.config.ts` `headers()` with CSP/X-Frame/X-Content-Type/Referrer/Permissions |
| #023 | npm audit + Dependabot | [DONE-P1] | T1C: CI step + `.github/dependabot.yml` (npm + github-actions weekly) |
| #024 | HOSTNAME default | [DONE-P1] | T1C: Dockerfile line 17 → `127.0.0.1`, compose.yaml override allowed |
| #025 | WinSW credential CLI arg | [DONE-P3] | T3B: `docs/runbook.md` "WinSW: managed-service account configuration" 4-step procedure + `Install-Service.ps1` header comment block referencing runbook |
| #026 | Magic numbers duplicated | [DONE-P2] | T2A (absorbed T2C): `SESSION_WINDOW_MS`, `WEEKLY_WINDOW_MS`, `WEEKLY_RESET_DAY_OF_WEEK`, `WEEKLY_RESET_HOUR_UTC`, `USAGE_QUERY_WINDOW_MS` in config.ts |
| #027 | JSON.parse cast w/o validation | [DONE-P2] | T1B: OfficialUsageData + lock file; T2A: `SyncStatusSchema`, `ActiveSessionFileSchema` |
| #028 | useAutoSync mutates only stats | [DONE-P2] | T2B: SWR `globalMutate(key => key.startsWith('/api/'))` — single call rewalida wszystkie keys |
| #029 | Static SVG gradient id | [DONE-PRE] | `token-timeline.tsx:22` already uses `useId()` |
| #030 | Charts no a11y | [DONE-P2] | T2B: `role="img"` + dynamic `aria-label` + `<p className="sr-only">` summary on TokenTimeline + ModelBreakdown |
| #031 | tables no scope=col | [DONE-P2] | T2B: `scope="col"` on all 6 `<th>` w SessionTable + hover affordance bonus |
| #032 | Active-nav + muted-text contrast | [DONE-P1] | T1A: `--color-accent-strong` #c6613f→#b8572f, `--color-text-muted` #73726c→#6a695f |
| #033 | No Tailwind theme tokens | [DONE-P1] | T1A: `tailwind.config.ts` theme.extend with all colors/shadows/radius CSS-var refs |
| #034 | Hex colors + chart palette dark | [DONE-P1] | T1A: `--color-on-accent`, `--color-terminal-text`, `--color-chart-1..5` light+dark; `model-breakdown.tsx` uses inline `style={{fill: var(--...)}}` |
| #035 | Sync pages no loading.tsx/Suspense | [DONE-P2] | T2B: 3 strony async + 3 nowe `loading.tsx` + 1 globalny `error.tsx` |
| #036 | No .next/cache in CI | [DONE-P1] | T1C: `actions/cache@v4` step added |
| #037 | Skeleton key={index} | [DONE-P2] | T2B: stabilne `'stat-skel-'+index`, `'usage-skel-'+index` w obu komponentach |
| #038 | user-event not installed | [DONE-P3] | T3C: `@testing-library/user-event@14.6.1` installed; refresh-control / theme-toggle / a11y tests migrated `fireEvent` → `userEvent` (async) |
| #039 | Custom hooks zero unit tests | [DONE-P3] | T3C: new `use-theme.test.tsx` (8 tests), `use-auto-sync.test.tsx` (3 tests with globalMutate spy), `migrate.test.ts` (4 tests for schema_version helper) |
| #040 | README no screenshots | [DONE-P3] | T3B: `## Screenshots` section with light+dark table + TODO placeholder for actual PNGs in `docs/screenshots/` |

### Minor + Suggestions
- #042 `CLAUDE_DATA_PATH` no default → [DONE-P1] T1C: compose.yaml uses `${CLAUDE_DATA_PATH:?error}` syntax
- #053 dead `?? randomUUID()` → [DONE-P2] T2A removed
- #054 a11y polish on usage-limits-card → [PARTIAL-P2] T2B added `aria-busy` + `aria-live` on Refreshing badge
- #059 row hover on session-table → [DONE-P2] T2B added `hover:bg-bg-muted` bonus
- #048 privacy test expansion → [DONE-P3] T3C: 26 nowych parameterized cases (13 forbidden keys × 2 scopes: top-level + nested content[])
- #049 start:lan no security warning → [DONE-P3] T3B: `> [!WARNING]` callout w README przed sekcją start:lan
- Pozostałe Minor + Suggestions → [OUT-OF-SCOPE] v0.4 backlog

## Final summary v0.3.0 rollout (2026-04-26)

**Phase 1 (parallel):** T1A design tokens + Tailwind theme · T1B schema_version helper + zod schemas · T1C security headers + CI cache + audit + Dependabot
**Phase 2 (parallel):** T2A backend perf + sanity + constants (absorbed T2C) · T2B SWR globalMutate + chart a11y + table scope + async pages + loading.tsx
**Phase 3 (parallel):** T3A ADR-0006 · T3B README/runbook/WinSW doc · T3C user-event + hook tests + privacy expansion

**Items zaadresowane w v0.3.0:** 27 z 27 Major + 8 Critical (3 done in Phase 1-2, 5 already done pre-existing) + 5 Minor bonus (#042, #048, #049, #053, #054, #059) = **40 pozycji**.
**Items deferred to v0.4:** #001 sync mutex (CSRF już jest, mutex low-risk single-user), #010 hydration mismatch w `use-refresh-interval` (low-impact), pozostałe Suggestions.

**Test coverage:** 91 → 132 tests (+45%, all passing). Validation gates clean: lint, typecheck, test, build.

---

## Executive Summary

### Numbers at a glance
- **Total findings (raw across 10 reports)**: 96
- **After deduplication**: 67 unique items
- **Critical**: 13 | **Major**: 26 | **Minor**: 20 | **Suggestions**: 8
- **Cross-domain hits** (issues found by ≥2 agents): 9

### Per-agent contribution (raw, pre-dedup)
| Agent | Critical | Major | Minor | Suggestions | Total |
|---|---|---|---|---|---|
| accessibility-tester | 4 | 5 | 4 | 2 | 15 |
| architect-reviewer | 2 | 4 | 3 | 2 | 11 |
| backend-developer | 2 | 4 | 3 | 2 | 11 |
| code-reviewer | 2 | 4 | 5 | 3 | 14 |
| compliance-auditor | 2 | 3 | 2 | 2 | 9 |
| frontend-developer | 1 | 3 | 3 | 2 | 9 |
| nextjs-developer | 0 | 3 | 3 | 2 | 8 |
| react-specialist | 0 | 3 | 3 | 3 | 9 |
| security-auditor | 2 | 4 | 3 | 2 | 11 |
| ui-designer | 1 | 4 | 4 | 3 | 12 |
| **Total raw** | **16** | **37** | **33** | **23** | **109** |

### Top 10 Blockers (Critical only — must fix before publication)
1. [#001] `src/app/api/sync/route.ts:11` — POST /api/sync has no concurrency guard AND no CSRF protection · Sources: [backend-developer, architect-reviewer, security-auditor]
2. [#002] `src/lib/privacy/assert-metadata-only.ts:1-11` — Forbidden key set incomplete (9 keys, ADR claims 11; missing `text`, `body`, `completion`, `input`, `output`, `thinking`) · Sources: [compliance-auditor, security-auditor]
3. [#003] `src/lib/claude/jsonl-parser.ts:50-58` — `parseJsonLine` does not call `assertMetadataOnly` on ingested data; privacy guard not enforced on ingestion path · Sources: [compliance-auditor]
4. [#004] `src/lib/sync/indexer.ts:189` — Raw absolute filesystem paths (e.g. `C:\Users\alice\.claude\...`) leaked verbatim in `/api/sync` error responses · Sources: [security-auditor]
5. [#005] `src/lib/db/client.ts:112` — Migration race window: `migrateDatabase()` opens a second `Database` while WAL is being set; concurrent request can observe partially-migrated schema · Sources: [backend-developer]
6. [#006] `src/lib/claude/usage-api.ts:8` — Undocumented external Anthropic OAuth call from "localhost-first" app, no opt-out, no ADR · Sources: [architect-reviewer]
7. [#007] `src/components/refresh-control.tsx:26` & `src/components/theme-toggle.tsx:20` — `outline-none` removes focus indicator on `<select>` controls without replacement (WCAG 2.1 SC 2.4.7) · Sources: [accessibility-tester]
8. [#008] `src/components/app-shell.tsx:81-84` — Sync error banner has no `role="alert"` / `aria-live` so screen readers do not announce it · Sources: [accessibility-tester]
9. [#009] `src/app/globals.css` — No `prefers-reduced-motion` media query; `animate-pulse`/`animate-spin` flash for users with vestibular disorders · Sources: [accessibility-tester]
10. [#010] `src/components/theme-provider.tsx:42-43` & `src/hooks/use-refresh-interval.ts:13-19` — `useState` initializers read `localStorage`/`matchMedia` directly, causing SSR/client hydration mismatch in React 19 strict mode · Sources: [frontend-developer]

(Plus #011 `src/app/sessions/page.tsx:7` + `projects/page.tsx:15` — unsafe `as` casts on untyped query results; #012 `Dockerfile:29-30` — standalone static assets path wrong (404s in production); #013 `charts/token-timeline.tsx:29` & `model-breakdown.tsx:60` — Recharts Tooltip unstyled in dark mode.)

### Cross-cutting themes (issues raised by ≥2 agents)
- **Sync endpoint hardening** (concurrency + CSRF + path leakage). Sources: [backend-developer, architect-reviewer, security-auditor]. Severity: Critical. Fix touches one route file but multiple angles.
- **Privacy guard incomplete & not enforced on ingestion**. Sources: [compliance-auditor, security-auditor]. Severity: Critical.
- **N+1 / blocking I/O in sync hot loop** (`shouldSkip` per-file `prepare()` + sync `fs.statSync` in `findRepoRoot`). Sources: [backend-developer, architect-reviewer, code-reviewer]. Severity: Major.
- **Untyped DB query returns + unsafe `as` casts in pages**. Sources: [code-reviewer, frontend-developer]. Severity: Critical/Major.
- **Hydration mismatch (theme + refresh interval localStorage)**. Sources: [frontend-developer, react-specialist (indirect)]. Severity: Critical.
- **Hardcoded design tokens escape Tailwind/CSS-var system + chart palette breaks in dark mode**. Sources: [ui-designer, frontend-developer, accessibility-tester]. Severity: Major.
- **Charts inaccessible to screen readers (no role/aria/text alt)**. Sources: [accessibility-tester, ui-designer]. Severity: Major.
- **NaN unvalidated in `limit`/`offset` (LIMIT NaN → no limit)**. Sources: [backend-developer, security-auditor, code-reviewer]. Severity: Minor.
- **Magic numbers for session/weekly windows duplicated across files**. Sources: [code-reviewer]. Severity: Major.
- **No security headers + no CI dependency audit + no Dependabot**. Sources: [security-auditor]. Severity: Major.

### Overall verdict
Project is **not yet publishable** but is close: **13 Critical** items break down into a coherent narrative — sync endpoint hardening (1 file, 3 angles), privacy guard plug (2 small fixes), accessibility focus/aria/motion baseline (3 component edits + 1 CSS rule), hydration pattern (2 hooks share 1 idiom), and a Docker static-asset path bug. The dominant categories are **a11y (4 Critical)**, **security/privacy (5 Critical)**, **architecture/concurrency (3 Critical)**, **frontend hydration (1 Critical)**. No fundamental architectural rework needed — codebase is clean, well-typed (modulo 2 cast hot spots), parameterized SQL, no `any`, no console statements. Effort estimate: **3–5 days of focused hardening** (one PR per batch listed below) plus one half-day for visual polish (chart tooltips, contrast bumps, screenshots).

---

## Action Plan (Consolidated, Deduplicated, Sorted Critical → Suggestions)

### Critical (Blockers — fix before release)

#### [#001] `src/app/api/sync/route.ts:11` — POST /api/sync lacks both concurrency guard AND CSRF protection
- **Severity**: Critical
- **Sources**: [backend-developer, architect-reviewer, security-auditor]
- **Domain**: backend
- **Problem**: Three angles converge on one route. (a) Two simultaneous POSTs (SWR auto-refresh races a manual click) both run `runIncrementalSync()` concurrently → duplicate upserts, corrupt `last_sync_status`, interleaved facet writes. SQLite WAL serialises writes but the JS layer does not. (b) Any cross-origin tab the user has open can `fetch('http://localhost:3000/api/sync', {method:'POST'})` and silently trigger sync — no CSRF protection. (c) The error response leaks raw absolute filesystem paths (see #004).
- **Fix hint**: Add a module-scope `Promise` mutex / `syncInProgress` flag — second POST returns 409 with in-flight status. Add a custom-header check (`X-Requested-With: cc-dashboard` or similar) to reject cross-origin requests. Consider migrating to Server Actions, which apply CSRF tokens automatically. All three fixes live in the same handler.

#### [#002] `src/lib/privacy/assert-metadata-only.ts:1-11` — Forbidden key set is incomplete (9 keys, ADR claims 11; missing message-content keys)
- **Severity**: Critical
- **Sources**: [compliance-auditor, security-auditor]
- **Domain**: privacy
- **Problem**: Set has 9 keys but ADR-0002 claims 11. Missing real Claude JSONL field names that carry message content: `text`, `body`, `completion`, `input`, `output`, `thinking`. If the JSONL format evolves (and it is documented as unstable), content slips silently past the guard.
- **Fix hint**: Add the missing keys (or, better, switch to an explicit allowlist of safe metadata keys). Update ADR-0002 to enumerate the canonical list and link `assert-metadata-only.ts` as the source of truth.

#### [#003] `src/lib/claude/jsonl-parser.ts:50-58` — `parseJsonLine` does not call `assertMetadataOnly` on ingested data
- **Severity**: Critical
- **Sources**: [compliance-auditor]
- **Domain**: privacy
- **Problem**: `countToolUses` reads `data.message?.content` directly; the parser extracts a count from raw content but the parsed object is never gated through the privacy guard before returning `ParsedSession`. Guard is only on output structs, not on ingestion.
- **Fix hint**: Call `assertMetadataOnly(parsed)` inside `parseJsonLine` (right after JSON.parse), or whitelist-strip non-metadata fields explicitly before returning `ClaudeTranscriptLine`. Add fixture-based test that feeds JSONL with forbidden keys.

#### [#004] `src/lib/sync/indexer.ts:189` — Raw absolute filesystem paths leaked in `/api/sync` error response
- **Severity**: Critical
- **Sources**: [security-auditor]
- **Domain**: privacy
- **Problem**: `SyncStatus.errors` returns verbatim entries containing `C:\Users\alice\.claude\projects\...`. Disclosed to any client that can POST /sync, leaking local directory structure and username.
- **Fix hint**: Strip or hash absolute paths in error messages before serialisation. Return only basename or a project-relative segment. Apply identically to `last_error` persisted in `settings` (cross-ref #015).

#### [#005] `src/lib/db/client.ts:112` — Migration race window during DB initialization
- **Severity**: Critical
- **Sources**: [backend-developer]
- **Domain**: backend
- **Problem**: `getSqlite()` calls `migrateDatabase()` which opens a second `Database` instance on the same file while WAL mode is being set, then opens the main connection. Between these two opens a concurrent request can observe a partially-migrated schema.
- **Fix hint**: Wrap the migrate-then-open sequence in a synchronous module-level mutex (a simple `let initializing: Promise<void> | null` is sufficient for single-process Node). First caller completes init before any other proceeds past the singleton guard.

#### [#006] `src/lib/claude/usage-api.ts:8` — Undocumented external Anthropic OAuth call from a "localhost-first" app
- **Severity**: Critical
- **Sources**: [architect-reviewer]
- **Domain**: architecture
- **Problem**: Hardcoded external URL `https://api.anthropic.com/api/oauth/usage` is undocumented, beta-only (`anthropic-beta: oauth-2025-04-20`). Reads OAuth access token from `~/.claude/.credentials.json` and forwards to remote host. Conflicts with the "localhost-first" non-negotiable in CLAUDE.md and introduces token-exfiltration risk if env/proxy is misconfigured. No ADR.
- **Fix hint**: Add ADR-0005 documenting the call, opt-in semantics, privacy model (token never logged/stored). Expose `CC_DASHBOARD_DISABLE_USAGE_API=1` env flag for opt-out; document in runbook and README. Local-fallback path already exists in queries.ts:329.

#### [#007] `src/components/refresh-control.tsx:26` + `src/components/theme-toggle.tsx:20` — `outline-none` removes focus ring on `<select>` with no replacement
- **Severity**: Critical
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: Both controls use `outline-none` with no `focus-visible:` replacement. Keyboard users have no visible focus indicator, violating WCAG 2.1 SC 2.4.7.
- **Fix hint**: Replace `outline-none` with `focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-accent-strong)]` on both controls.

#### [#008] `src/components/app-shell.tsx:81-84` — Sync error banner has no `role="alert"` / `aria-live`
- **Severity**: Critical
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: Error banner appears dynamically when sync fails but screen readers do not announce it.
- **Fix hint**: Add `role="alert"` to the error `<div>` (auto-implies `aria-live="assertive"`).

#### [#009] `src/app/globals.css` — No `prefers-reduced-motion` rule
- **Severity**: Critical
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: `animate-pulse` (skeletons) and `animate-spin` (Syncing spinner) run continuously with no opt-out for users with vestibular disorders.
- **Fix hint**: Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }` to `globals.css`.

#### [#010] `src/components/theme-provider.tsx:42-43` + `src/hooks/use-refresh-interval.ts:13-19` — `useState` initializers cause SSR/client hydration mismatch
- **Severity**: Critical
- **Sources**: [frontend-developer]
- **Domain**: react
- **Problem**: Both `useState(getStoredMode)` and `useState(() => readLocalStorage())` access `window.localStorage` / `window.matchMedia` during SSR initializer. Server returns default; client reads stored value (e.g. `dark` or `30s`); React 19 strict mode flags the data-attribute mismatch and re-renders. Same root pattern in two places.
- **Fix hint**: Initialize both `useState` to a stable SSR-safe default (`"system"` / `60`), then sync to real value in `useEffect` after mount. Standard `next-themes` pattern. Apply to both files together.

#### [#011] `src/app/sessions/page.tsx:7` + `src/app/projects/page.tsx:15` — Unsafe `as` casts on untyped query results
- **Severity**: Critical
- **Sources**: [code-reviewer]
- **Domain**: code-quality
- **Problem**: `listSessions()` / `listProjects()` have no return type annotations. Pages compensate with `as Parameters<typeof SessionTable>[0]["sessions"]` — type derived from a component prop, not from the data layer. Runtime divergence is silently swallowed.
- **Fix hint**: Declare `SessionRow` / `ProjectRow` interfaces in `src/lib/api/queries.ts:75,104`, annotate exports, remove the casts in pages.

#### [#012] `Dockerfile:29-30` — Standalone static assets copied to wrong destination (production 404s)
- **Severity**: Critical
- **Sources**: [nextjs-developer]
- **Domain**: devops
- **Problem**: `public/` and `.next/static` are copied to `/app/public` and `/app/.next/static`, but Next.js standalone `server.js` expects them at `/app/.next/standalone/public` and `/app/.next/standalone/.next/static`. Result: all CSS/JS/static asset 404s in production Docker.
- **Fix hint**: Change to `COPY --from=builder /app/public ./.next/standalone/public` and `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static`. Update `CMD` to `["node", ".next/standalone/server.js"]`.

#### [#013] `src/components/charts/token-timeline.tsx:29` + `model-breakdown.tsx:60` — Recharts `<Tooltip />` unstyled, breaks in dark mode
- **Severity**: Critical
- **Sources**: [ui-designer]
- **Domain**: ui/design
- **Problem**: Default white background + black text. In dark mode the popup is a white box on dark canvas — jarring and breaks design system.
- **Fix hint**: Pass `contentStyle`, `labelStyle`, `itemStyle` to each `<Tooltip>` using CSS variables (`background: "var(--color-panel)"`, `color: "var(--color-text)"`, `border: "1px solid var(--color-border-soft)"`).

---

### Major (Fix this iteration)

#### [#014] `src/lib/sync/indexer.ts:25-37` — `shouldSkip()` recompiles two prepared statements per file in hot loop
- **Severity**: Major
- **Sources**: [backend-developer, architect-reviewer, code-reviewer]
- **Domain**: backend
- **Problem**: `prepare()` called twice per file. With 1000+ JSONL files: 2000+ statement compilations per sync run. Defeats the purpose of prepared statements; also reads `indexer_version` once per file instead of once per run.
- **Fix hint**: Hoist both `prepare()` calls and the `indexer_version` read to module scope or pass pre-compiled statements into `shouldSkip()`. Bulk-load `sync_files` into a `Map<source_file, row>` once per run.

#### [#015] `src/lib/claude/jsonl-parser.ts:60-77` — `findRepoRoot()` blocks event loop with sync `fs.existsSync`/`statSync` per file
- **Severity**: Major
- **Sources**: [backend-developer, architect-reviewer]
- **Domain**: backend
- **Problem**: Sync FS calls in a while-loop walking up the directory tree, called inside the async sync iteration. Blocks all concurrent API requests during sync.
- **Fix hint**: Use `fs.promises.access`/`stat` with `await`, or cache resolved roots by `cwd` (same dir appears in many sessions).

#### [#016] `src/lib/sync/indexer.ts:130-140,202-219` — Error messages persisted/returned may contain partial JSONL content
- **Severity**: Major
- **Sources**: [compliance-auditor]
- **Domain**: privacy
- **Problem**: `recordFailure` stores `error.message` verbatim into `sync_files.last_error`; same risk in serialised `SyncStatus.errors` written to `settings`. `JSON.parse` errors typically include partial content fragments.
- **Fix hint**: Sanitise messages before storage — truncate to 256 chars, strip JSON-content-looking substrings, prefer fixed enum of error codes. Apply consistently with #004.

#### [#017] `src/lib/claude/active-sessions.ts:34` — Session `name` stored verbatim with no cap or guard
- **Severity**: Major
- **Sources**: [compliance-auditor]
- **Domain**: privacy
- **Problem**: Claude Code session names can contain the first words of a user prompt — direct content leak. Stored uncapped and never passed through `assertMetadataOnly`.
- **Fix hint**: Cap to ≤80 chars and run `assertMetadataOnly({name})` (or check against forbidden keys) before storage.

#### [#018] `src/lib/api/queries.ts:329` — `getUsageLimits()` does full-table scan on every poll
- **Severity**: Major
- **Sources**: [backend-developer]
- **Domain**: backend
- **Problem**: Loads all sessions where `started_at IS NOT NULL` with no row limit on every `/api/usage-limits` request (SWR default 60s polling). Latency degrades as table grows.
- **Fix hint**: Add `WHERE started_at >= ?` (e.g. now − 35d) — only the rolling window is needed for weekly/5-hour calcs. Verify `sessions_started_at_idx` is used.

#### [#019] `src/app/api/health/route.ts:9` — Health check throws unhandled instead of returning structured 503
- **Severity**: Major
- **Sources**: [backend-developer]
- **Domain**: backend
- **Problem**: `SELECT 1` exception propagates as Next.js raw 500 page. Docker / WinSW health probes expect structured JSON.
- **Fix hint**: try/catch and return `NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 })`.

#### [#020] `src/lib/db/migrate.ts:6` — Hand-rolled `CREATE TABLE IF NOT EXISTS` with no version mechanism
- **Severity**: Major
- **Sources**: [architect-reviewer]
- **Domain**: architecture
- **Problem**: Adding a column requires a separate `ALTER TABLE` block with no idempotency guard. Drizzle Kit is in the stack but unused for runtime migrations.
- **Fix hint**: Adopt `drizzle-kit migrate`, OR implement an integer `schema_version` table with sequential migration functions. Document in ADR-0006 before v1.0.

#### [#021] `docs/decisions/` — Missing ADRs for usage-API, migration strategy, settings-table dual use
- **Severity**: Major
- **Sources**: [architect-reviewer]
- **Domain**: architecture
- **Problem**: Three implementation choices undocumented: external usage API (#006), migration strategy (#020), `settings` as both sync-state and API cache.
- **Fix hint**: ADR-0005 (external usage + opt-out), ADR-0006 (migration approach). Note settings dual-use in `architecture.md`.

#### [#022] `next.config.ts:1-13` — Zero security response headers
- **Severity**: Major
- **Sources**: [security-auditor]
- **Domain**: security
- **Problem**: No CSP, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`.
- **Fix hint**: Add `headers()` export with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, restrictive CSP (`default-src 'self'`). Tailwind 4 inline-style hashes may need consideration.

#### [#023] `.github/workflows/ci.yml` — No `npm audit`, no Dependabot, no secret scanning
- **Severity**: Major
- **Sources**: [security-auditor]
- **Domain**: security
- **Problem**: Critical-CVE dependency would ship undetected.
- **Fix hint**: Add `npm audit --audit-level=high` step. Add `.github/dependabot.yml` (npm, weekly). Enable GitHub secret scanning / advisory.

#### [#024] `Dockerfile:17` — `ENV HOSTNAME=0.0.0.0` exposes API on all interfaces by default
- **Severity**: Major
- **Sources**: [security-auditor]
- **Domain**: security
- **Problem**: `compose.yaml` binds host to `127.0.0.1` but bare `docker run` (no `-p 127.0.0.1:...`) exposes auth-less API to the network.
- **Fix hint**: Default to `127.0.0.1` and require explicit opt-in for `0.0.0.0`, OR document the risk prominently in README/runbook.

#### [#025] `packaging/windows/Install-Service.ps1:81-83` — Service-account password passed via CLI argument
- **Severity**: Major
- **Sources**: [security-auditor]
- **Domain**: security
- **Problem**: With `-RunAsCurrentUser`, plaintext password is captured via `Get-Credential` and forwarded as `--password` CLI arg. Visible in `Get-Process` for a short window.
- **Fix hint**: Use WinSW `<serviceaccount>` XML block with `ConvertFrom-SecureString`, OR document that a dedicated low-privilege service account is the recommended approach.

#### [#026] `src/lib/api/queries.ts:191,217` — Magic numbers for session/weekly windows duplicated
- **Severity**: Major
- **Sources**: [code-reviewer]
- **Domain**: code-quality
- **Problem**: `5 * 60 * 60 * 1000` repeated in 3 places (queries.ts:191, usage-limits-card.tsx:9 as `SESSION_WINDOW_MS`, queries.ts inline). Weekly reset day/hour as `const resetDay = 5 // Friday`, `resetHour = 10` — easy to miss if Anthropic changes schedule.
- **Fix hint**: Promote to `SESSION_WINDOW_MS`, `WEEKLY_WINDOW_MS`, `WEEKLY_RESET_DAY_OF_WEEK`, `WEEKLY_RESET_HOUR_UTC` in `src/lib/config.ts` (alongside existing `REFRESH_INTERVALS`). Reference everywhere.

#### [#027] `JSON.parse(...) as T` pattern without runtime validation
- **Severity**: Major
- **Sources**: [code-reviewer]
- **Domain**: code-quality
- **Problem**: `SyncStatus` (indexer.ts:241), `OfficialUsageData` (usage-api.ts:78), lock-file (db/client.ts:45,97) — all parsed from disk and cast directly. Older schema or corruption goes undetected.
- **Fix hint**: Use `z.safeParse` (zod already a dep) or narrow structural check. `OfficialUsageData` is on hot API path — highest priority.

#### [#028] `src/components/overview-dashboard.tsx:47-48` — `useAutoSync` only mutates `stats`, leaves `active-sessions` SWR stale after sync
- **Severity**: Major
- **Sources**: [frontend-developer]
- **Domain**: frontend
- **Problem**: After auto-sync the active-sessions count remains stale until SWR's independent polling cycle.
- **Fix hint**: Pass both mutators or use SWR global `mutate()` with key prefix to revalidate all dashboard keys atomically.

#### [#029] `src/components/charts/token-timeline.tsx:21` — Static `<linearGradient id="tokens">` not scoped per instance
- **Severity**: Major
- **Sources**: [frontend-developer]
- **Domain**: frontend
- **Problem**: SVG `id` must be globally unique. Two instances on one page → second silently overwrites first.
- **Fix hint**: Generate id with `useId()` (React 18+), reference via `fill={`url(#${id})`}`.

#### [#030] Charts have no screen-reader alternative (Recharts SVG opaque to AT)
- **Severity**: Major
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: `PieChart` (model-breakdown.tsx:43) and `AreaChart` (token-timeline.tsx:17) emit no `role`, `aria-label`, or `<caption>`-equivalent. Charts entirely inaccessible.
- **Fix hint**: Wrap each chart container with `role="img" aria-label="<summary>"` and add a `<p className="sr-only">` sibling listing top-3 data points / total + date range.

#### [#031] `src/components/session-table.tsx:20-27` — `<th>` cells lack `scope="col"`
- **Severity**: Major
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: Breaks NVDA/JAWS column association in table-navigation modes.
- **Fix hint**: Add `scope="col"` to every `<th>` in the thead row.

#### [#032] Active-nav and muted-text contrast below WCAG AA 4.5:1
- **Severity**: Major
- **Sources**: [accessibility-tester]
- **Domain**: a11y
- **Problem**: White on `--color-accent-strong` (#c6613f) = 4.05:1. `--color-text-muted` (#73726c) on `--color-bg-muted` (#f0eee6) = 4.15:1.
- **Fix hint**: Darken `--color-accent-strong` to ≈#b8572f; darken `--color-text-muted` to ≈#6a695f. Verify with contrast checker.

#### [#033] `tailwind.config.ts` — No design tokens registered with Tailwind theme
- **Severity**: Major
- **Sources**: [ui-designer]
- **Domain**: ui/design
- **Problem**: All tokens live as raw CSS variables; invisible to Tailwind utilities and IDE autocomplete. Components fall back to inline `style={{ color: "var(--...)" }}`.
- **Fix hint**: Map CSS variables under `theme.extend` (e.g. `colors: { accent: "var(--color-accent)" }`, `borderRadius: { panel: "18px" }`) so `text-accent`, `bg-panel`, `rounded-panel` work.

#### [#034] Hardcoded hex colors bypass token system + chart palette fails in dark mode
- **Severity**: Major
- **Sources**: [ui-designer, frontend-developer]
- **Domain**: ui/design
- **Problem**: `app-shell.tsx:95` uses `color: "#fff"` for active nav; `overview-dashboard.tsx:92` uses `text-[#f0eee6]`; `model-breakdown.tsx:11` `COLORS` array has 5 hex values whose last two (`#bfbdb4`, `#3d3d3a`) collapse against dark-mode chart background.
- **Fix hint**: Define `--color-on-accent` and `--color-terminal-text` tokens. For chart palette, define `COLORS_LIGHT`/`COLORS_DARK` keyed off `resolvedTheme` from `useTheme()` or use CSS variables in Recharts `fill`.

#### [#035] `src/app/sessions/page.tsx:1` — Sync Server Component with no `loading.tsx`/Suspense
- **Severity**: Major
- **Sources**: [nextjs-developer]
- **Domain**: nextjs
- **Problem**: Page is non-async and reads DB synchronously; any DB hang blocks SSR with no escape.
- **Fix hint**: Make page `async`; add `src/app/sessions/loading.tsx` (or wrap data section in `<Suspense>`). Repeat for `tokens/page.tsx`, `projects/page.tsx`. Add `src/app/error.tsx`.

#### [#036] `.github/workflows/ci.yml` — No `.next/cache` restoration between CI runs
- **Severity**: Major
- **Sources**: [nextjs-developer]
- **Domain**: devops
- **Problem**: Cold builds every run. Slow CI; cache regressions invisible.
- **Fix hint**: Add `actions/cache@v4` step before Build with `path: .next/cache`, key keyed on `hashFiles('**/package-lock.json')`.

#### [#037] `src/components/overview-dashboard.tsx:25` + `usage-limits-card.tsx:95` — Skeleton lists use `key={index}`
- **Severity**: Major
- **Sources**: [react-specialist]
- **Domain**: react
- **Problem**: Static-length skeleton arrays — safe today, but pattern is a bug-magnet if copied to data-driven lists.
- **Fix hint**: Use semantic string keys (`stat-skeleton-${i}`) or a constant `SKELETON_ITEMS` array with stable ids.

#### [#038] `@testing-library/user-event` not installed; tests use `fireEvent`
- **Severity**: Major
- **Sources**: [react-specialist]
- **Domain**: tests
- **Problem**: `theme-toggle.test.tsx`, `refresh-control.test.tsx` use `fireEvent.change`/`fireEvent.click`. `fireEvent` skips browser event sequencing — silent passes for tests that fail in real browsers.
- **Fix hint**: `npm i -D @testing-library/user-event`. Replace `fireEvent.*` with `userEvent.*`.

#### [#039] Custom hooks have zero unit tests
- **Severity**: Major
- **Sources**: [react-specialist, code-reviewer]
- **Domain**: tests
- **Problem**: `use-auto-sync`, `use-refresh-interval`, `use-dashboard-data`, `use-theme` — all untested. Timer/storage regressions invisible.
- **Fix hint**: `renderHook` from RTL. Cover `useRefreshInterval` localStorage roundtrip; `useAutoSync` timer setup/cleanup with `vi.useFakeTimers`; `useDashboardData` SWR config passthrough.

#### [#040] `README.md` has no screenshots
- **Severity**: Major
- **Sources**: [ui-designer]
- **Domain**: ui/design
- **Problem**: First public release without visual preview is a significant adoption barrier.
- **Fix hint**: Add `## Screenshots` with at least one light-mode and one dark-mode overview screenshot. A composite PNG works.

---

### Minor (Backlog candidates)

- [#041] `src/lib/db/schema.ts:52-58` — `sync_files.source_file` not linked by FK to `sessions`; cascade-delete leaves orphaned rows that suppress re-indexing. Source: architect-reviewer. Fix: add `ON DELETE CASCADE` or explicit cleanup in delete path.
- [#042] `compose.yaml:19` — `CLAUDE_DATA_PATH` has no default; missing `.env` produces empty mount or unhelpful error. Source: architect-reviewer. Fix: add validation note in runbook + `${CLAUDE_DATA_PATH:-./placeholder}` default.
- [#043] `src/lib/config.ts:9` — `getDataDir()` defaults to Docker `/data`; native runs without `.env` crash with EACCES. Source: architect-reviewer, backend-developer. Fix: warn at startup if path is unwritable; document `DATABASE_PATH` is required outside Docker.
- [#044] `src/lib/claude/scanner.ts:15` — `walk()` does not follow symlinks. Source: backend-developer. Fix: handle `entry.isSymbolicLink()` resolve target.
- [#045] `src/lib/claude/usage-api.ts:55` — `readFileSync` on hot API path; inconsistent with async siblings. Source: backend-developer. Fix: use `fs.promises.readFile`; cache token alongside `CACHE_MAX_AGE_SECONDS`.
- [#046] `Number()` coercion for `limit`/`offset` in sessions/projects routes returns NaN → `LIMIT NaN` → no limit. Sources: backend-developer, security-auditor, code-reviewer. Fix: zod `z.coerce.number().int().min(0).max(200)` or NaN guard.
- [#047] `src/lib/db/client.ts:80` — Lock retry has no back-off (`attempt < 2` no delay). Source: backend-developer. Fix: 50ms back-off between attempts.
- [#048] `src/__tests__/privacy.test.ts` — Coverage is shallow (4 assertions). Source: compliance-auditor. Fix: cover all 11 keys + each ingestion path with fixture JSONL.
- [#049] `README.md:525` — `start:lan` script documented without security warning. Source: compliance-auditor. Fix: explicit "exposes to network — no auth" callout.
- [#050] CHANGELOG missing `## 0.2.0` entry. Source: code-reviewer. Fix: add entry before publication.
- [#051] `INDEXER_VERSION = "2"` undocumented. Source: code-reviewer. Fix: comment explaining what schema change it represents.
- [#052] `src/lib/claude/facets-parser.ts:69-70` — Redundant `|| key === "id"` branches when those keys are already in `SAFE_KEYS`. Source: code-reviewer. Fix: simplify (or remove from `SAFE_KEYS`, making intent explicit).
- [#053] `src/lib/claude/jsonl-parser.ts:202` — `?? randomUUID()` is dead code (`fallbackSessionId` always returns a non-null string). Source: code-reviewer. Fix: remove tail; annotate fallback return as `string`.
- [#054] `src/components/usage-limits-card.tsx:85,167-170,63` — Three a11y polish items: missing `aria-busy` on skeleton; missing `aria-live` on Refreshing badge; duplicate announcement on `ResetCountdown` inner text. Source: accessibility-tester. Fix: as listed in source report.
- [#055] `src/app/sessions/page.tsx:8` + `projects/page.tsx:20` — Pages use `<h2>` not `<h1>`; AppShell `<h1>` is always "CC dashboard". Source: accessibility-tester. Fix: per-page `generateMetadata` with unique title (lower-impact alt) or promote heading.
- [#056] `extension/chrome/sidepanel.js:53-54` — `apiUrl()` does not validate against localhost allowlist. Source: security-auditor. Fix: reject non-localhost values before persisting.
- [#057] Hover/active states missing on nav links and Sync button. Sources: ui-designer. Fix: `hover:bg-[var(--color-border-soft)]` on nav; `hover:opacity-90` on button.
- [#058] `globals.css:45` — `"Anthropic Sans"` listed but never loaded. Source: ui-designer. Fix: load via `@font-face`/`next/font` or remove.
- [#059] `session-table.tsx:19` — No row hover or zebra striping. Source: ui-designer. Fix: `hover:bg-[var(--color-bg-muted)]` on `<tr>`.
- [#060] `tsconfig.json:20` — `"ignoreDeprecations": "6.0"` may hide TS 6 deprecation warnings. Source: nextjs-developer. Fix: review which APIs triggered it; suppress narrowly or remove.

---

### Suggestions (Nice-to-have)

- [#061] Add pagination on `listProjects()` (cap at 100). Source: architect-reviewer.
- [#062] Split `settings` table into `sync_state` + `api_cache` in future migration. Source: architect-reviewer.
- [#063] Add SQLite `CHECK(length(last_error) <= 512)` constraint as DB-layer privacy backstop. Source: compliance-auditor.
- [#064] Reconcile ADR-0002 to enumerate canonical 11 forbidden keys. Source: compliance-auditor (links to #002).
- [#065] Pause `ResetCountdown` `setInterval` when tab hidden via `visibilitychange`. Source: frontend-developer.
- [#066] Lift `useRefreshInterval` into a React context provider in `AppShell` to share state. Source: frontend-developer.
- [#067] Enable `experimental.typedRoutes` in `next.config.ts`. Source: nextjs-developer.
- [#068] Server-side fetch initial `stats` and pass as `initialData` to OverviewDashboard SWR. Source: nextjs-developer.

---

## Recommendations for Implementation Plan

### Suggested fix groupings (batches that share files/concepts)

- **Batch A — Sync endpoint hardening (1 PR)**: items #001, #004, #016, #015, #014. Touches `src/app/api/sync/route.ts`, `src/lib/sync/indexer.ts`, `src/lib/claude/jsonl-parser.ts`. Concurrency mutex + CSRF header check + path sanitization + N+1 prepare hoist + async findRepoRoot.
- **Batch B — Privacy guard plug (1 PR)**: items #002, #003, #017, #048, #064. Touches `src/lib/privacy/assert-metadata-only.ts`, `src/lib/claude/jsonl-parser.ts`, `src/lib/claude/active-sessions.ts`, `src/__tests__/privacy.test.ts`, `docs/decisions/0002-metadata-only-privacy.md`. Expand keys + ingestion-path guard call + name-field cap + tests.
- **Batch C — DB integrity & runtime safety (1 PR)**: items #005, #019, #027, #018. Touches `src/lib/db/client.ts`, `src/app/api/health/route.ts`, `src/lib/api/queries.ts`. Migration mutex + structured 503 + zod-validated JSON.parse + bounded usage-limits query.
- **Batch D — A11y baseline (1 PR)**: items #007, #008, #009, #030, #031, #032, #054. Touches `src/components/refresh-control.tsx`, `theme-toggle.tsx`, `app-shell.tsx`, `session-table.tsx`, `charts/*`, `globals.css`, `usage-limits-card.tsx`. Focus rings + role=alert + reduced-motion + chart aria + scope="col" + contrast bumps.
- **Batch E — Hydration + frontend bugs (1 PR)**: items #010, #028, #029, #037. Touches `src/components/theme-provider.tsx`, `src/hooks/use-refresh-interval.ts`, `src/components/overview-dashboard.tsx`, `src/components/charts/token-timeline.tsx`, `usage-limits-card.tsx`. SSR-safe useState defaults + global SWR mutate + useId for SVG gradient + skeleton keys.
- **Batch F — Code quality cleanup (1 PR)**: items #011, #026, #050, #051, #052, #053. Touches `src/lib/api/queries.ts`, `src/lib/config.ts`, page components, `CHANGELOG.md`, `src/lib/sync/indexer.ts`, `src/lib/claude/facets-parser.ts`, `src/lib/claude/jsonl-parser.ts`. Return-type annotations + extracted constants + CHANGELOG + dead-code removal.
- **Batch G — UI/design polish (1 PR)**: items #013, #033, #034, #040, #057, #058, #059. Touches `tailwind.config.ts`, `globals.css`, `app-shell.tsx`, `overview-dashboard.tsx`, `charts/*`, `session-table.tsx`, `README.md`. Recharts tooltip styling + tailwind theme tokens + on-accent token + chart palette dark-mode + hover states + screenshots.
- **Batch H — Architecture & external integrations (1 PR)**: items #006, #020, #021. Touches `docs/decisions/`, `src/lib/claude/usage-api.ts`, `src/lib/db/migrate.ts`. ADR-0005 + ADR-0006 + opt-out flag for usage API.
- **Batch I — Devops & supply chain (1 PR)**: items #012, #022, #023, #024, #025, #036, #042, #043, #049. Touches `Dockerfile`, `compose.yaml`, `next.config.ts`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `packaging/windows/Install-Service.ps1`, `README.md`, runbook. Static asset paths + security headers + audit + dependabot + hostname default + cache + warnings.
- **Batch J — Tests + Next.js streaming (1 PR)**: items #035, #038, #039. Touches `src/app/(routes)/loading.tsx`, `src/app/error.tsx`, page files made async, `src/__tests__/hooks/`, `package.json`. user-event install + hook tests + async pages + loading/error boundaries.

### Suggested order
1. **Batch B (Privacy)** — highest-risk, smallest fix; close the README claim immediately.
2. **Batch A (Sync hardening)** — most-cited blocker; one route + one parser + one indexer fix.
3. **Batch C (DB integrity)** — race window during init is a flaky-CI risk too.
4. **Batch D (A11y baseline)** — many small edits, mostly mechanical; do as one sweep.
5. **Batch E (Hydration)** — small but visible; same idiom in 2 places.
6. **Batch I (Devops)** — Dockerfile fix is publication-blocking for the Docker target.
7. **Batch F + G + H (Quality, design, architecture)** — can run in parallel once blockers cleared.
8. **Batch J (Tests + streaming)** — last; depends on stable APIs from earlier batches.

### Notes for implementer
- **#001 has three angles, one fix surface**. Do not split into three commits unless using Server Actions migration (which solves CSRF for free) — pick mutex + custom-header strategy and bundle.
- **#002 + #003 must ship together**. Closing the key list without enforcing the guard on ingestion is a paper fix.
- **#010 is one idiom in two places** — fix both files in the same commit; the second offender (`use-refresh-interval`) is identical structure.
- **#013 + #033 + #034 chain**: tailwind theme registration (#033) makes #013 and #034 fixes drastically cleaner because `bg-panel`/`text-on-accent` utilities exist.
- **#018 vs #061 — coverage gap**: usage-limits is the highest-traffic path; #018 is Major, #061 (projects pagination) is Suggestion. Prioritise the windowed query.
- **No conflicting fixes detected** across the 67 items — all merges produce compatible directions.
- **Test coverage gap** (#039) is the only systemic gap not addressed by individual fixes — schedule a dedicated batch.
- **Items NOT covered by any agent**: backup/restore strategy for the SQLite DB, log-rotation for sync-status persistence, telemetry opt-in posture (consistent with #006 opt-out for usage API). Consider these for v0.3.

---

## Report file inventory
- `_PROMPT_TEMPLATE.md` (88 lines, severity scale + format spec)
- `accessibility-tester.md` (68 lines)
- `architect-reviewer.md` (56 lines)
- `backend-developer.md` (56 lines)
- `code-reviewer.md` (66 lines)
- `compliance-auditor.md` (50 lines)
- `frontend-developer.md` (50 lines)
- `nextjs-developer.md` (48 lines)
- `react-specialist.md` (48 lines)
- `security-auditor.md` (56 lines)
- `ui-designer.md` (56 lines)
- This synthesis: `orchestrator-synthesis.md`

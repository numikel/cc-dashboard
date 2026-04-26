# Backend Developer — Review Report

## Scope
- Files reviewed: `src/app/api/` (7 routes), `src/lib/db/` (client, schema, migrate), `src/lib/sync/indexer.ts`, `src/lib/claude/` (jsonl-parser, facets-parser, active-sessions, scanner, usage-api), `src/lib/api/queries.ts`, `src/lib/config.ts`, `drizzle.config.ts`, `next.config.ts`
- Date: 2026-04-26
- Tools used: Glob, Read, Grep

## Stats
- Critical: 2 | Major: 4 | Minor: 3 | Suggestions: 2

## Findings

### Critical

- [Critical] src/app/api/sync/route.ts:11 — POST /api/sync has no concurrency guard; parallel requests will run two `runIncrementalSync()` calls simultaneously, causing duplicate upserts and corrupt `last_sync_status` in the settings table.
  Fix: Add a module-level `syncInProgress` boolean flag (or a `Promise` ref) and return HTTP 409 if a sync is already running before awaiting `runIncrementalSync()`.

- [Critical] src/lib/db/client.ts:112 — `getSqlite()` is not thread-safe for the migration window: it calls `migrateDatabase()` which opens a second `Database` instance on the same file while WAL mode is being set, and only then opens the main connection — between those two opens another concurrent request can observe a partially migrated schema.
  Fix: Wrap the migrate-then-open sequence in a synchronous module-level mutex (a simple flag is sufficient for single-process Node.js) so the first caller completes initialization before any concurrent caller proceeds past the `if (sqlite && migratedPath === databasePath)` guard. Cross-ref: security-auditor.

### Major

- [Major] src/lib/sync/indexer.ts:25 — `shouldSkip()` opens two prepared statements (reads `settings` and `sync_files`) per file inside a hot loop with no statement caching; for 1,000+ JSONL files this creates 2,000+ statement compilations per sync run.
  Fix: Hoist both `prepare()` calls outside `shouldSkip()` to module-level or pass pre-compiled statements in, matching the pattern used in `indexFacets()`.

- [Major] src/lib/claude/jsonl-parser.ts:61 — `findRepoRoot()` performs synchronous `fs.existsSync` / `fs.statSync` I/O in an ascending loop per file. Called from `parseClaudeJsonlSession()` which is awaited inside `runIncrementalSync()`, so every indexed file triggers multiple blocking FS stat calls on the event loop.
  Fix: Replace with `fs.promises.stat` / `fs.promises.access` and `await` within the already-async `parseClaudeJsonlSession`, or cache resolved repo roots by path prefix.

- [Major] src/lib/api/queries.ts:329 — `getUsageLimits()` (local fallback path) loads all sessions with `started_at IS NOT NULL` with no row limit. As the sessions table grows into thousands of rows, this full table scan on every `/api/usage-limits` poll (SWR default 60 s) will cause noticeable latency.
  Fix: Add a `WHERE started_at >= ?` bound (e.g. 35 days) to restrict to the rolling window actually needed for the weekly/5-hour calculations; add a `sessions_started_at_idx` if not covered (it is — verify the plan uses it).

- [Major] src/app/api/health/route.ts:9 — Health check runs `SELECT 1` synchronously but throws unhandled if DB is unavailable; the uncaught exception propagates as a 500 with a raw Next.js error page instead of a structured `{ status: "error" }` JSON body expected by Docker / WinSW health probes.
  Fix: Wrap in try/catch and return `NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 })`.

### Minor

- [Minor] src/lib/config.ts:8 — `getDataDir()` defaults to `/data` which is Docker-specific; native (npm / WinSW) installs silently write to the root `/data` path when neither `DATA_DIR` nor `DATABASE_PATH` is set, which will fail on Windows with a permission error rather than a clear startup message.
  Fix: For native runtimes detect Docker with `process.env.container` or document that `DATABASE_PATH` is required outside Docker; add a validation log on startup if the resolved path is under `/data`.

- [Minor] src/lib/claude/scanner.ts:15 — `walk()` does not follow symlinks (`entry.isFile()` returns false for symlink-to-file with `withFileTypes`). If Claude Code stores JSONL files via symlinks, they are silently skipped.
  Fix: Add an `entry.isSymbolicLink()` branch that resolves the target and re-checks `isFile()` (or use `fs.stat` instead of `lstat` which `readdir withFileTypes` uses internally).

- [Minor] src/lib/claude/usage-api.ts:55 — `readUsageToken()` reads `.credentials.json` synchronously via `fs.readFileSync` on a hot path called from every `/api/usage-limits` request (cache miss). For a locally-deployed server this is benign but inconsistent with the rest of the async module.
  Fix: Convert to async `fs.promises.readFile` consistent with the module's `async` callers; the token could also be cached for the `CACHE_MAX_AGE_SECONDS` window alongside usage data.

### Suggestions

- [Suggestion] src/app/api/sessions/route.ts:8 — `limit` and `offset` params are coerced with `Number()` but not validated for NaN: `Number("abc")` returns `NaN`, `Math.min(NaN, 200)` returns `NaN`, and SQLite receives `NaN` as `null`, returning all rows.
  Fix: Add `|| 0` or use `parseInt(..., 10)` with a NaN fallback, or introduce a minimal zod schema for the two params.

- [Suggestion] src/lib/db/client.ts:80 — The lock-acquisition loop retries at most twice (`attempt < 2`) with no delay between attempts; on a heavily loaded system the stale-lock cleanup and re-open may race within the same tick and fail on the second attempt.
  Fix: Add a short `setTimeout`-based back-off (e.g. 50 ms) between the two attempts, or increase the retry count to 3.

## Summary

The backend is well-structured for a local-only tool: Drizzle schema is normalized, WAL mode is enabled, queries use parameterized statements (no SQL injection surface), and the JSONL parser is appropriately defensive against malformed input. The two critical issues — missing sync concurrency guard and the race window during DB initialization — are both realistic failure modes under the default SWR auto-refresh behavior and should be fixed before public release. The major N+1 statement compilation in the sync hot path and the unbounded full-table scan in usage-limits will become performance problems as data grows. No Claude Code data dir writes detected; privacy guard is correctly applied in facets-parser.

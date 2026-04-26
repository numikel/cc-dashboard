# Architect Reviewer — Review Report

## Scope
- Files reviewed: `docs/architecture.md`, `docs/decisions/0001-0004`, `docs/runbook.md`, `CLAUDE.md`, `src/app/api/` (7 routes), `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/migrate.ts`, `src/lib/sync/indexer.ts`, `src/lib/claude/` (6 files), `src/lib/api/queries.ts`, `src/lib/config.ts`, `compose.yaml`, `Dockerfile`, `packaging/windows/`, `extension/chrome/manifest.json`
- Date: 2026-04-26
- Tools used: Glob, Read, Grep

## Stats
- Critical: 2 | Major: 4 | Minor: 3 | Suggestions: 2

## Findings

### Critical

- [Critical] `src/app/api/sync/route.ts:11` — No concurrency guard on `POST /api/sync`: two simultaneous requests (SWR auto-refresh races with a manual trigger) both call `runIncrementalSync()` concurrently, walking the same file set and writing overlapping SQLite transactions. SQLite WAL serialises writes but the async JS layer does not, so partial session upserts can interleave with `indexFacets()` running from a second invocation.
  Fix: Add an in-process async mutex (e.g. a `Promise` lock variable in module scope) so a second `POST` either returns the in-flight status or a 409. This is a standard pattern for single-process local services.

- [Critical] `src/lib/claude/usage-api.ts:8` — Hardcoded external URL `https://api.anthropic.com/api/oauth/usage` is an undocumented, beta-only endpoint (`anthropic-beta: oauth-2025-04-20`). Reading an OAuth access token from `~/.claude/.credentials.json` and forwarding it to a remote host violates the spirit of the "localhost-first" non-negotiable and introduces a token-exfiltration risk if the endpoint URL is ever misconfigured or the env is proxied. No ADR documents this external call or its privacy implications.
  Fix: Add ADR-0005 documenting the external call, its opt-in nature, and the privacy model (token never logged/stored). Expose an env flag `CC_DASHBOARD_DISABLE_USAGE_API=1` to let security-conscious users opt out completely; document it in the runbook.

### Major

- [Major] `src/lib/sync/indexer.ts:26-37` — `shouldSkip()` issues one `SELECT` against `settings` (to read `indexer_version`) and one against `sync_files` per file, inside a sequential `for` loop with no batching. With hundreds of JSONL files this becomes O(N) round-trips on every sync poll cycle. SQLite is in-process so latency is low, but the pattern will degrade noticeably at scale and is architecturally unsound.
  Fix: Hoist both reads out of the loop — read `indexer_version` once before the loop, and bulk-load `sync_files` into a `Map<path, row>` keyed by `source_file` before iterating.

- [Major] `src/lib/db/migrate.ts:6` — Custom hand-rolled `CREATE TABLE IF NOT EXISTS` migration has no versioning mechanism: adding a new column in the future requires a separate `ALTER TABLE` block with no guard against running it twice. Drizzle Kit is already in the stack but is not used for runtime migrations.
  Fix: Either adopt `drizzle-kit push` / `drizzle-kit migrate` for the migration lifecycle, or implement a simple integer `schema_version` table with sequential migration functions. Document the migration strategy in an ADR before v1.0.

- [Major] `src/lib/claude/jsonl-parser.ts:60-77` — `findRepoRoot()` performs synchronous `fs.existsSync` + `fs.statSync` I/O in a tight while-loop walking the directory tree upward. This runs inside `parseClaudeJsonlSession()`, which is itself called inside an `async for` loop in `runIncrementalSync()`. Blocking the Node.js event loop on each file degrades all concurrent API requests during sync.
  Fix: Rewrite `findRepoRoot` using `fs.promises.access` / `fs.promises.stat` and `await`, or cache results keyed by `cwd` since the same working directory appears in many sessions.

- [Major] `docs/decisions/` — No ADR covers: (a) the external Anthropic OAuth usage API call, (b) the migration strategy (hand-rolled SQL vs drizzle-kit), (c) the `settings` table as a key-value store for both sync state and API cache. Three critical implementation choices are undocumented, increasing maintenance risk before public release.
  Fix: Add ADR-0005 (external usage API + opt-out), ADR-0006 (migration approach). Document the `settings` table dual-use pattern in architecture.md.

### Minor

- [Minor] `src/lib/db/schema.ts:52-58` — `sync_files` table is not linked to `sessions` by a foreign key; `sourceFile` is repeated as a plain text field in `sessions`. If a session is deleted (cascade from project delete), the orphaned `sync_files` row remains, and the next sync will skip re-indexing the file because `shouldSkip()` sees a matching mtime/size.
  Fix: Either add `ON DELETE CASCADE` from `sessions.source_file` to `sync_files.source_file`, or explicitly delete orphaned `sync_files` rows in the project-delete code path.

- [Minor] `compose.yaml:19` — `CLAUDE_DATA_PATH` bind mount has no default value; if the variable is unset, Docker Compose will mount an empty string or fail with an unhelpful error. The `required: false` on `env_file` means the `.env` is optional, so a fresh clone with no `.env` gets a broken compose config.
  Fix: Add a validation note in `runbook.md` and consider a `docker compose config` pre-flight check that verifies `CLAUDE_DATA_PATH` is set; alternatively supply a safe default like `${CLAUDE_DATA_PATH:-./claude-data-placeholder}` with a comment.

- [Minor] `src/lib/config.ts:9` — `getDataDir()` falls back to `"/data"` (Docker path) when `DATA_DIR` is unset. On a native `npm start` without a `.env`, SQLite is written to `/data/dashboard.db` which is root-owned on macOS/Linux and will crash with EACCES. The runbook instructs users to copy `.env.example` but does not describe what happens if they skip it.
  Fix: Log a startup warning if `DATABASE_PATH` resolves to `/data/dashboard.db` and the directory does not exist or is not writable; suggest setting `DATA_DIR` to a local path.

### Suggestions

- [Suggestion] `src/app/api/projects/route.ts` — No pagination on `listProjects()` (unbounded query). For a power user with 200+ projects this will return all rows on every dashboard load. Low risk today but worth capping before v1.0.
  Fix: Add optional `limit`/`offset` params mirroring the sessions route, with a generous default (e.g. 100).

- [Suggestion] Architecture — The `settings` table serves three unrelated concerns: sync state (`last_sync_status`, `indexer_version`), feature flags, and API response cache (`official_usage_cache`). This is acceptable for v0.2 but will become a maintenance liability.
  Fix: Consider splitting into purpose-specific tables (e.g. `sync_state`, `api_cache`) in a future migration to make schema intent explicit.

## Summary

The architecture is coherent with CLAUDE.md constraints: data separation, read-only Claude mount, localhost-first, and metadata-only privacy are all properly enforced. The layering (`lib/` → `app/api/` → clients) is clean. Two issues block a confident public release: the sync endpoint has no concurrency guard (race condition risk), and the undocumented external OAuth API call needs an ADR and an opt-out path before shipping. The hand-rolled migration approach and the per-file `shouldSkip` loop are the most likely sources of maintenance pain in v1.0+.

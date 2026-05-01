# 0006. Schema versioning and forward-only migrations

## Status

Accepted (2026-04-26).

## Context

Before this decision, schema creation was handled by hand-rolled `CREATE TABLE IF NOT EXISTS` blocks in a standalone `migrateDatabase()` function. This was idempotent for initial table creation but offered no version tracking. Adding a column required a separate `ALTER TABLE` block with no idempotency guard — running it twice on the same database would throw.

A second problem was structural: `migrateDatabase()` opened its own `Database` instance, ran migrations, and closed it. `client.ts` then opened a second `Database` instance for normal operation. Between close and reopen, another process could observe the database in a partially initialized WAL state. This race window was recorded as recon item #005 (Critical).

Drizzle Kit was listed in dependencies but unused at runtime. Its migration model requires generated SQL files in a `drizzle/` folder and a build-time CLI invocation (`drizzle-kit migrate`). For a single-developer, single-instance local tool, this adds toolchain weight with limited benefit.

## Decision

Adopt a lightweight `schema_version` helper based on SQLite's built-in `pragma user_version`.

- A `Migration[]` array in `src/lib/db/migrate.ts` holds every schema change indexed by integer version. Each entry carries a `version` number, a human-readable `name`, and an `up(db)` function.
- `runMigrations(db)` reads the current `user_version` pragma and applies every migration whose `version` exceeds it in ascending order.
- Each migration is executed inside `db.transaction()`. If `up(db)` throws, the transaction rolls back and the `user_version` is not bumped. Failure is atomic.
- Migration v1 (`initial_schema`) is the existing schema verbatim (`CREATE TABLE IF NOT EXISTS ...`). Databases that were created by v0.2.x have `user_version = 0`; running v1 against them is a structural no-op (all tables already exist) but correctly advances `user_version` to 1.
- `client.ts` opens the database exactly once in `getSqlite()` and calls `runMigrations(next)` on that same open handle before returning it to callers. The separate `migrateDatabase()` entry point (used for CLI invocation) opens, migrates, and closes its own handle in isolation. Neither path opens two concurrent handles to the same database file during normal startup, closing the race window from recon item #005.

## Alternatives rejected

**Drizzle Kit `migrate` command.** Drizzle Kit generates SQL migration files in a `drizzle/` directory and requires `drizzle-kit migrate` at startup or build time. This is appropriate when a team needs auditable, reviewable SQL diffs stored in version control. For the current single-developer scope it adds a build-time dependency and a generated-file convention that is heavier than the problem warrants. Reconsider for v1.0 if the team or deployment surface grows.

**Status quo: keep `CREATE TABLE IF NOT EXISTS` without `user_version`.** Idempotent for initial table creation, but `ALTER TABLE` statements have no built-in idempotency. Every future column addition would require an ad-hoc existence check or a try/catch wrapper. This compounds as the schema evolves and provides no machine-readable signal of what schema version a given database is on.

## Consequences

- **Adding a column** means appending one entry to `migrations[]`:
  ```ts
  { version: 2, name: "add_foo", up: (db) => db.exec("ALTER TABLE sessions ADD COLUMN foo TEXT") }
  ```
  The version guard ensures this runs exactly once per database file.
- **`pragma user_version` is the sole source of truth** for DB schema state. Do not attempt to infer schema version from table structure.
- **Historical migrations are immutable.** Never edit an already-shipped `up()` function. If a correction is needed, add a new migration entry.
- **Forward-only.** Rollback is not supported at the migration layer. For destructive changes (e.g., dropping a column), document a manual recovery procedure in the migration's inline comment and in `docs/runbook.md`.
- **Existing v0.2.x databases** migrate safely on first startup. No data loss. The v1 baseline migration is entirely `CREATE TABLE IF NOT EXISTS`, so it is a no-op for databases that already contain those tables.
- **Race window closed.** Because `getSqlite()` calls `runMigrations()` on the single open handle rather than delegating to a function that opens a second handle, the WAL initialization and schema migration now happen within a single database lifecycle (recon item #005 resolved).

## References

- Implementation: `src/lib/db/migrate.ts`
- Invocation: `src/lib/db/client.ts` — `getSqlite()` calls `runMigrations(next)` on the open handle
- Related: ADR-0001 (single-container, SQLite choice)
- SQLite reference: [`pragma user_version`](https://www.sqlite.org/pragma.html#pragma_user_version)
- Plan: `C:\Users\micha\.claude\plans\zapoznaj-si-z-ai-temp-reviews-orchestrat-lively-neumann.md`

## Indexer version semantics (INDEXER_VERSION)

Apart from the DB schema version tracked by `pragma user_version`, the sync
indexer maintains its own versioning string (`INDEXER_VERSION` in
`src/lib/sync/indexer.ts`). This controls whether previously-indexed files are
re-processed even when their mtime and size have not changed.

**When to bump**: any change to how the indexer derives *what metadata is stored*
from a JSONL file. Examples: adding a new field to `ParsedSession`, changing
`SAFE_KEYS` in `facets-parser.ts`, changing skip-eligibility logic in `shouldSkip`.

**Current value** (`"2"`): introduced during the v0.3 hardening pass.
Changes from `"1"` to `"2"` include: facets SAFE_KEYS revised (removed
`id`/`session_id`/`sessionId` as auto-excluded), session name capped to 80 chars,
`shouldSkip` refactored to bulk-load `sync_files` into a `Map` once per run.

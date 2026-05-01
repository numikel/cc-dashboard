---
status: Accepted
date: 2026-05-01
---

# ADR-0009: Settings Table Split (sync_state + api_cache)

## Status
Accepted

## Context
The monolithic `settings` table mixed two concerns:
- **Persistent sync state**: `indexer_version`, `last_sync_status`
- **TTL-bounded cache entries**: `pricing_snapshot`, `official_usage_cache`

This made it impossible to enforce expiry at the DB level and violated synthesis finding #062.

## Decision
Migration v4 (`settings_split`) splits `settings` into two tables:

**`sync_state`**:
- Columns: `key`, `value`, `updated_at`
- Purpose: persistent key-value store with no expiry
- Examples: `indexer_version`, `last_sync_status`

**`api_cache`**:
- Columns: `key`, `value`, `expires_at`, `updated_at`
- Purpose: TTL cache with DB-level expiry field
- Examples: `pricing_snapshot`, `official_usage_cache`

All reads through `readCache<T>(key, schema, now)` in `src/lib/db/api-cache.ts` are Zod-validated, closing synthesis finding #027 (N-002 regression).

Migration v5 (`sync_files_last_error_check`) adds `CHECK (last_error IS NULL OR length(last_error) <= 512)` and truncates existing oversized values during migration.

## Alternatives Rejected
- **Keep `settings` + add `expires_at` column**: mixed concerns remain; existing rows need a nullable column with sentinel magic values.
- **Separate Redis/cache layer**: overkill for a local app.

## Consequences
- Forward-only migration; rollback requires restoring the SQLite file from backup.
- Future cache entries go in `api_cache`; future persistent state goes in `sync_state`.
- All cache reads must use `readCache<T>()` and pass a Zod schema for validation.

## References
- ADR-0006: Schema versioning and migration strategy
- ADR-0008: Pricing engine cache usage

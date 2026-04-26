# Compliance Auditor — Review Report

## Scope
- Files reviewed: `src/lib/privacy/assert-metadata-only.ts`, `src/lib/claude/jsonl-parser.ts`, `src/lib/claude/facets-parser.ts`, `src/lib/claude/active-sessions.ts`, `src/lib/claude/types.ts`, `src/lib/sync/indexer.ts`, `src/lib/db/schema.ts`, `src/__tests__/privacy.test.ts`, `src/__tests__/jsonl-parser.test.ts`, `SECURITY.md`, `docs/decisions/0002-metadata-only-privacy.md`, `extension/chrome/manifest.json`, `LICENSE`, `package.json`, `README.md`
- Date: 2026-04-26
- Tools used: Read, Grep, Glob

## Stats
- Critical: 2 | Major: 3 | Minor: 2 | Suggestions: 2

## Findings

### Critical

- [Critical] `src/lib/privacy/assert-metadata-only.ts`:1-10 — Forbidden key set (9 keys) is incomplete: missing `"text"`, `"body"`, `"completion"`, `"input"`, `"output"` — all are real Claude JSONL field names that carry message content.
  Fix: Add at minimum `"text"`, `"body"`, `"completion"` to `FORBIDDEN_METADATA_KEYS`; cross-reference actual Claude JSONL field names. The ADR (0002) claims 11 forbidden keys; the set has only 9. Document the canonical 11 in the ADR.

- [Critical] `src/lib/claude/jsonl-parser.ts`:50-58 — `countToolUses` reads `data.message?.content` (line 145) directly without calling `assertMetadataOnly`; the parser extracts a count from raw content but never gates the parsed object through the privacy guard before returning `ParsedSession`. If a JSONL line embeds unexpected keys (e.g. `text`, `body`), they propagate silently.
  Fix: Call `assertMetadataOnly(parsed)` inside `parseJsonLine` after line 9, or strip all non-metadata fields explicitly before returning `ClaudeTranscriptLine`. The guard must be on the ingestion path, not only on the output struct.

### Major

- [Major] `src/lib/sync/indexer.ts`:130-140 — `recordFailure` stores the raw exception `error.message` string into `sync_files.last_error` (SQLite column `TEXT`, unbounded). If the JSONL parser throws with a message that includes parsed content fragments (e.g. from a `JSON.parse` error showing partial JSON), that fragment reaches the DB.
  Fix: Sanitize `message` before storage — truncate to 256 chars and strip any substring matching known content patterns. Consider a fixed-enum of error codes instead of free-form strings.

- [Major] `src/lib/sync/indexer.ts`:202-219 — `SyncStatus.errors` (array of `{file, message}`) is serialised as JSON into `settings.last_error` in SQLite, then surfaced to the audit API. Same risk as above: error messages from parse failures may contain partial JSONL content.
  Fix: Same sanitisation as above; apply before the `JSON.stringify(status)` call.

- [Major] `src/lib/claude/active-sessions.ts`:34 — `parsed.name` (session name from `.json` files) is stored verbatim with no length cap and no privacy guard. Claude Code session names can contain the first words of a user prompt.
  Fix: Apply `scalarToString` equivalent with a short cap (≤80 chars) and run `assertMetadataOnly({name: parsed.name})` or at minimum check against `FORBIDDEN_METADATA_KEYS` before storage.

### Minor

- [Minor] `src/__tests__/privacy.test.ts`:1-15 — Privacy test coverage is shallow (4 assertions, 2 `it` blocks). Missing: (a) test that the guard rejects the keys absent from the set (`text`, `body`); (b) test that `jsonl-parser` output passes the guard when the input JSONL contains a `content` array; (c) test that `active-sessions` name field is sanitised.
  Fix: Expand to cover all 11 ADR-listed keys and each ingestion path (jsonl, facets, active-sessions) with fixture JSONL that includes forbidden keys.

- [Minor] `README.md`:525 — `start:lan` script (`next start -H 0.0.0.0`) is documented without a security warning. A casual reader may run it without realising it exposes the dashboard (and all local Claude data paths) to the local network.
  Fix: Add an explicit callout: "Exposes the server to the local network — no authentication. Only use on a trusted network."

### Suggestions

- [Suggestion] `src/lib/db/schema.ts`:57 — `sync_files.last_error` is an unbounded `TEXT` column. Add a SQLite `CHECK(length(last_error) <= 512)` constraint to enforce the sanitisation at the DB layer as a second line of defence.
  Fix: Add `CHECK` constraint in schema and migration.

- [Suggestion] `docs/decisions/0002-metadata-only-privacy.md` — ADR states "11 forbidden keys" but the implementation has 9. Reconcile the number and list all keys explicitly in the ADR so future contributors know the canonical set.
  Fix: Update the ADR to enumerate the exact key list; add a link to `assert-metadata-only.ts` as the source of truth.

## Summary

The metadata-only privacy promise is structurally sound: the DB schema contains no columns that store prompt or response text, the Chrome extension is correctly scoped to localhost, and no secrets were found in source files. However, the privacy guard has two critical gaps — incomplete forbidden-key set (9 vs. claimed 11) and no guard call on the JSONL ingestion path itself — meaning content could silently pass through if the JSONL format evolves. Two error-logging paths additionally risk persisting partial message content into SQLite. The project is **not publishable as-is**: the two Critical findings and the active-sessions name leak (Major) must be fixed before the privacy claim in the README can be considered verifiable in code.

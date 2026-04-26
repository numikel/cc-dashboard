# 0002. Metadata-only privacy model

## Status

Accepted. Updated 2026-04-26 with explicit allow-list and ingestion enforcement.

## Context

Claude Code transcripts can contain private prompts, code snippets, secrets or client data. The dashboard needs usage analytics without increasing the risk of exposing that content.

The original decision (2025-09) phrased the constraint in prose ("metadata only, no prompt or response content"). A 2026-04 review revealed two gaps:

1. The privacy guard was a deny-list of nine keys (`content`, `prompt`, `response`, `summary`, `goal`, `outcome`, `messages`, `transcript`, `conversation`). New Claude/Anthropic content fields (`text`, `thinking`, `body`, `completion`, `input`, `output`) would slip through silently.
2. The guard was only invoked on persisted output structures (e.g. `SafeFacets`). The JSONL ingestion path (`parseClaudeJsonlSession`) wrote `data.message?.content` and `data.message?.usage` into the parser without ever calling `assertMetadataOnly`.

## Decision

**Store only derived metadata** — timestamps, token counts, model identifiers, project paths, Git branch, duration, message counts and tool-use counts. Full prompt and assistant response content must not be stored in SQLite or returned by API routes.

**Enforcement: allow-list (not deny-list).** The privacy guard is an explicit allow-list of safe metadata keys plus a defence-in-depth deny-list. Any key that is neither allow-listed nor explicitly forbidden raises an error. The guard is invoked on the **ingestion** path so that unexpected JSONL fields are caught before any data is persisted.

The canonical lists live in `src/lib/privacy/assert-metadata-only.ts`:

- `SAFE_METADATA_KEYS` — explicit allow-list of identification, model, time, project, usage and tool-use metadata keys (see source for full enumeration).
- `FORBIDDEN_METADATA_KEYS` — defence-in-depth deny-list: `body`, `completion`, `conversation`, `goal`, `messages`, `outcome`, `output`, `prompt`, `response`, `summary`, `text`, `thinking`, `transcript`.

Two structural exceptions are baked into the guard:

- `tool_use` items inside `content` arrays may carry user-controlled `input` (Bash command strings, Edit file paths). The guard accepts `input` as opaque on tool_use items but never recurses into it. Tool arguments are never persisted by the indexer (only the count is recorded).
- `content` itself is allow-listed because the parser inspects it to count `tool_use` items. Items inside the array are validated; if any item carries a forbidden key (e.g. a `text` block in an assistant response) the guard throws.

## Consequences

- **Defence in depth**: even if Anthropic introduces a new content field, the allow-list will reject it by default and tests must be updated to add it.
- **Ingestion-time enforcement**: forbidden content from JSONL fails the parse for that file; `runIncrementalSync` records the error in `sync_files.last_error` and skips the session. Other files continue to index.
- **Maintenance cost**: every legitimately new metadata field requires updating `SAFE_METADATA_KEYS` and adding a regression test. This is the deliberate trade-off for keeping the format strictly bounded.
- **Tests** in `src/__tests__/privacy.test.ts` enforce the metadata-only boundary, including the JSONL ingestion path.

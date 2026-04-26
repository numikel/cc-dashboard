# Code Reviewer — Review Report

## Scope
- Files reviewed: all 52 `src/**/*.ts` and `src/**/*.tsx`, `tsconfig.json`, `eslint.config.mjs`, `package.json`, `.github/workflows/ci.yml`, `CHANGELOG.md`
- Date: 2026-04-26
- Tools used: Glob, Grep, Read (full sweep)

## Stats
- Critical: 2 | Major: 4 | Minor: 5 | Suggestions: 3

## Findings

### Critical

- [Critical] src/app/sessions/page.tsx:7 — `listSessions()` return is cast `as Parameters<typeof SessionTable>[0]["sessions"]` because the function has no return type annotation. If the raw Drizzle/sqlite3 shape diverges from `SessionRow[]` at runtime the cast silently swallows the mismatch; there is no structural validation.
  Fix: Add an explicit return type `SessionRow[]` to `listSessions()` in `src/lib/api/queries.ts:75` and remove the `as` cast from the page; repeat for `listProjects()` (projects/page.tsx:15 applies the same pattern).

- [Critical] src/lib/sync/indexer.ts:26-38 — `shouldSkip()` calls `getSqlite()` (and prepares two statements) once per file inside the sync loop. On a large vault this opens a prepare-per-file hot path inside a tight loop; more importantly, the function recreates the prepared statement on every call, which defeats the purpose of SQLite prepared statements and can cause observable slowdowns that mask stuck syncs.
  Fix: Hoist the two `prepare()` calls outside `shouldSkip()` (e.g., lazily at module scope or as a parameter) so they are prepared once per sync run.

### Major

- [Major] src/lib/sync/indexer.ts:241 and src/lib/claude/usage-api.ts:78 and src/lib/db/client.ts:45,97 — `JSON.parse(...) as T` without runtime validation. `SyncStatus`, `OfficialUsageData`, and the lock-file object are all read from disk and cast directly. If the file is corrupt or written by an older schema the types lie at runtime.
  Fix: Either use `z.safeParse` (Zod is already a dependency) or add a narrow structural check before casting. The `OfficialUsageData` path is on the hot API response path, making it the highest priority.

- [Major] src/lib/api/queries.ts:75,104 — `listSessions()` and `listProjects()` have no explicit return types on exported functions (`strict` is on but return type inference from raw SQLite `.all()` returns `unknown[]`). Callers compensate with unsafe casts (sessions/page.tsx:7, projects/page.tsx:15).
  Fix: Declare `SessionRow` and `ProjectRow` interfaces in `queries.ts`, annotate both exports, and remove downstream casts.

- [Major] src/lib/api/queries.ts:191 — Magic number `5 * 60 * 60 * 1000` for the 5-hour session block is also hardcoded in `usage-limits-card.tsx:9` as `SESSION_WINDOW_MS` and in `queries.ts:191` inline. Three separate definitions of the same domain constant.
  Fix: Export a single `SESSION_WINDOW_MS` constant from `src/lib/config.ts` (alongside the existing `REFRESH_INTERVALS`) and reference it everywhere; same for `WEEKLY_WINDOW_MS`.

- [Major] src/lib/api/queries.ts:217 — Weekly reset day and hour are magic numbers (`const resetDay = 5 // Friday`, `const resetHour = 10`) with only a line comment explaining the value. If Anthropic's reset schedule changes these are easy to miss.
  Fix: Promote to named constants (`WEEKLY_RESET_DAY_OF_WEEK = 5`, `WEEKLY_RESET_HOUR_UTC = 10`) in `config.ts` with a comment linking to the Anthropic plan docs.

### Minor

- [Minor] src/app/sessions/page.tsx:7 and src/app/projects/page.tsx:15 — Inline `as` casts on query return values (covered above as Critical/Major). The pattern of using `as Parameters<typeof SessionTable>[0]["sessions"]` is especially brittle: it derives its type from a component prop instead of the authoritative data layer.
  Fix: Type the queries at the source (see Major finding above).

- [Minor] CHANGELOG.md — Only one entry (`0.1.0`). The project is now at `v0.2.0` (per `package.json`). No `## 0.2.0` section exists, violating the Conventional Commits / keep-a-changelog convention stated in `CLAUDE.md`.
  Fix: Add a `## 0.2.0` entry before publication documenting the features added since 0.1.0.

- [Minor] src/lib/sync/indexer.ts:8 — `INDEXER_VERSION = "2"` is an opaque magic string with no comment explaining what schema change it represents or when to bump it.
  Fix: Add a comment like `// Bump when indexing logic changes in a backwards-incompatible way (v2: added facets)`.

- [Minor] src/lib/claude/facets-parser.ts:69-70 — The `flatMap` callback explicitly filters out `"id"`, `"session_id"`, `"sessionId"` but the condition in the if-statement is `!SAFE_KEYS.has(key) || key === "id" || key === "session_id" || key === "sessionId"`. Since `"id"`, `"session_id"`, and `"sessionId"` are already in `SAFE_KEYS`, the `||` branches are dead/redundant code.
  Fix: Simplify to `if (!SAFE_KEYS.has(key) || key === "id" || key === "sessionId" || key === "session_id") return []` — or better: remove those identifiers from `SAFE_KEYS` to make the intent explicit: "id fields are safe to read but never emitted as facets".

- [Minor] src/lib/claude/jsonl-parser.ts:202 — `sessionId ?? fallbackSessionId(sourceFile) ?? randomUUID()`. `fallbackSessionId()` always returns a non-null string (it either returns the stem or a sha256 hex slice), so `?? randomUUID()` is unreachable dead code.
  Fix: Remove the trailing `?? randomUUID()` and annotate `fallbackSessionId` return type as `string`.

### Suggestions

- [Suggestion] src/hooks/use-refresh-interval.ts:21 — `setInterval` is used as a local function name, shadowing the global `window.setInterval`. While harmless in this module, the naming causes IDE confusion when the name collides with the global.
  Fix: Rename to `updateInterval` or `saveInterval`.

- [Suggestion] eslint.config.mjs — No `@typescript-eslint/no-explicit-any` or `@typescript-eslint/no-unsafe-*` rules are explicitly enabled beyond what `eslint-config-next/typescript` provides. Verify (via `npm run lint`) that these are active; if not, add them explicitly since `any` discipline is the first line of defence when `skipLibCheck: true` is set.
  Fix: Confirm `@typescript-eslint/no-explicit-any: error` is active in the resolved config, or add it explicitly.

- [Suggestion] src/__tests__/ (11 test files for 52 source files) — `scanner.ts`, `active-sessions.ts`, `usage-api.ts`, `queries.ts` (individual query functions), and `db/client.ts` lock logic are fully untested. Given these are the core data-path modules, coverage is below the 80% threshold stated in the review checklist.
  Fix: Add at minimum happy-path + error-path tests for `scanner.ts` (empty dir, nested JSONL) and `usage-api.ts` (cache hit, no-credentials, api-error paths). The indexer test already covers the main queries path indirectly.

## Summary

The codebase is clean, well-structured, and free of `any` types or console statements — a strong baseline. The two most urgent issues are the missing return-type annotations on `listSessions`/`listProjects` (which propagate into unsafe `as` casts in page components) and the repeated `JSON.parse(...) as T` without runtime validation on disk-backed data (lock file, sync status, usage cache). The magic-number scatter for the 5-hour session window and weekly reset schedule adds silent maintenance risk. With those four Major findings addressed the code quality is publishable; the missing `v0.2.0` CHANGELOG entry should also be resolved before the public release.

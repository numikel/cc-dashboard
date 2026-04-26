# 0005. External Anthropic usage API integration

## Status

Accepted (2026-04-26).

## Context

The dashboard's local SQLite metadata supports an *estimated* five-hour and weekly usage model based on aggregated JSONL token counts (`getUsageLimits` in `src/lib/api/queries.ts`). For Claude Code Pro/Max users, Anthropic exposes an authoritative endpoint:

```
GET https://api.anthropic.com/api/oauth/usage
Authorization: Bearer <token from ~/.claude/.credentials.json>
anthropic-beta: oauth-2025-04-20
```

The endpoint returns the same five-hour and seven-day utilization that Anthropic shows in the official Claude Code CLI. It is not yet a stable, documented API — the `anthropic-beta` header is required and the schema may change without notice.

The original implementation (added in v0.2.0, `src/lib/claude/usage-api.ts`) called this endpoint silently when `~/.claude/.credentials.json` was readable, with no opt-out mechanism and no ADR. This conflicts with two project constraints:

- **localhost-first** (CLAUDE.md, ADR-0004): the dashboard should not perform unsolicited network egress.
- **least surprise**: a privacy-conscious user inspecting the binary should be able to disable any external call without editing source.

## Decision

The external usage API integration stays — its data is materially better than the local estimate — but is governed by an explicit opt-in/opt-out contract.

1. **Opt-in by default when credentials exist.** If `~/.claude/.credentials.json` contains a valid OAuth token, `getOfficialUsageData()` is invoked. The token is treated as the user's signal that they are an Anthropic API customer and consent to fetching their own usage data.
2. **Explicit opt-out via environment variable.** Setting `CC_DASHBOARD_DISABLE_USAGE_API=1` (or `=true`) short-circuits `getOfficialUsageData()` to return `{ error: "disabled" }`. The caller (`getUsageLimits` in `queries.ts`) then falls back to the local estimate. The flag is checked on every call so it can be flipped without restarting the service.
3. **Privacy model.**
   - The OAuth token is read from disk per request and never written anywhere — not into logs, not into the SQLite cache, not into API responses.
   - Only the parsed numeric utilization values (five-hour %, weekly %, plus reset timestamps) are written to the `settings.official_usage_cache` row, with a 180-second TTL.
   - The fetch uses `cache: "no-store"` to prevent any browser/runtime cache layer from persisting the response.
4. **Failure modes are typed.** `OfficialUsageData.error` enumerates `"no-credentials" | "api-error" | "parse-error" | "disabled"`. `usage-limits-card.tsx` surfaces these to the user as a banner, not as an exception.

## Consequences

- Users with an Anthropic Pro/Max plan get authoritative usage data without configuration.
- Users without a token (or who pass `CC_DASHBOARD_DISABLE_USAGE_API=1`) see the local estimate with a "Local estimate" label and no degradation in the rest of the dashboard.
- The `anthropic-beta: oauth-2025-04-20` header pins the integration to the current beta contract; if Anthropic changes the schema, `parseUsageResponse` returns `null` and the caller falls back transparently. A future audit should re-validate the schema before each release.
- The `CC_DASHBOARD_DISABLE_USAGE_API` flag is documented in `README.md` (Configuration) and `docs/runbook.md` (Operations). Adding a new external call to the dashboard requires another ADR.

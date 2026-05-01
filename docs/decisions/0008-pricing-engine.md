---
status: Accepted
date: 2026-05-01
---

# ADR-0008: Pricing Engine Architecture

## Status
Accepted

## Context
v0.4.0 introduced cost estimation. The pricing engine must:
1. Work offline/air-gapped
2. Respect user opt-out
3. Stay accurate without bundling stale rate tables

## Decision
Three-tier lookup:

1. **`api_cache`** — `pricing_snapshot` key, 24h TTL, Zod-validated on read
2. **LiteLLM** — fetches `model_prices_and_context_window.json` on cache miss (5s timeout, server-side only)
3. **Regex fallback** — pattern matching on model ID family (opus/sonnet/haiku) for offline use

Opt-out: `CC_DASHBOARD_DISABLE_PRICING=1` skips LiteLLM fetch and returns an empty map; cost fields show `"–"`.

## Alternatives Rejected
- **Bundled static table**: drifts from actual invoice rates without a release.
- **Anthropic billing API**: requires OAuth credentials not all users have.
- **No pricing**: breaks the Costs page entirely.

## Consequences
- Rates may lag invoice by up to 24h (cache TTL).
- LiteLLM fetch is server-side; no client CSP impact.
- Air-gapped installs fall back to regex rates (approximate).

## References
- ADR-0005: Data sources and external API integration
- ADR-0009: `api_cache` table and settings split

# Security Auditor — Review Report

## Scope
- Files reviewed: `src/app/api/**`, `src/lib/privacy/`, `next.config.ts`, `extension/chrome/manifest.json+background.js+sidepanel.*`, `Dockerfile`, `compose.yaml`, `packaging/windows/`, `.github/workflows/ci.yml`, `SECURITY.md`, `package.json`
- Date: 2026-04-26
- Tools used: Glob, Grep, Read (no Context7 needed — findings are code-level, not framework API questions)

## Stats
- Critical: 2 | Major: 4 | Minor: 3 | Suggestions: 2

## Findings

### Critical

- [Critical] `src/app/api/sync/route.ts`:11 — Sync POST endpoint has no CSRF protection; any page the user visits can silently trigger a sync via `fetch('http://localhost:3000/api/sync', {method:'POST'})`.
  Fix: Add a custom request header check (e.g., `X-Requested-With: XMLHttpRequest`) or a CSRF token middleware on all state-mutating POST routes. Next.js Server Actions apply CSRF tokens automatically — consider migrating mutation endpoints.

- [Critical] `src/lib/sync/indexer.ts`:189 — `SyncStatus.errors` returned verbatim via `/api/sync` response includes raw filesystem paths (e.g., `C:\Users\alice\.claude\projects\...`). These are leaked to any client able to POST /sync, disclosing local directory structure.
  Fix: Strip or hash absolute paths in error messages before including them in the JSON response. Return only basename or a sanitised relative segment.

### Major

- [Major] `next.config.ts`:1-13 — Zero security response headers configured. No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. Next.js `headers()` callback is absent.
  Fix: Add a `headers()` export to `next.config.ts` with at minimum `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, and a restrictive CSP (`default-src 'self'`, script/style hashes for inline Tailwind).

- [Major] `.github/workflows/ci.yml`:1-38 — CI pipeline has no `npm audit`, no Dependabot config, and no secret-scanning step. A dependency with a critical CVE will ship undetected.
  Fix: Add `npm audit --audit-level=high` as a CI step after `npm ci`. Add `.github/dependabot.yml` with `package-ecosystem: npm` and weekly cadence. Consider adding `trufflesecurity/trufflehog` or GitHub secret scanning (free for public repos).

- [Major] `Dockerfile`:17 — `ENV HOSTNAME=0.0.0.0` binds the container to all interfaces by default. While `compose.yaml` binds the host port to `127.0.0.1`, users running `docker run` directly (without compose) expose the API on all interfaces without authentication.
  Fix: Document clearly in README that bare `docker run` without `-p 127.0.0.1:3000:3000` is insecure. Alternatively change the default to `127.0.0.1` and require an explicit opt-in for `0.0.0.0` — consistent with `npm start -H 127.0.0.1`.

- [Major] `packaging/windows/Install-Service.ps1`:81-83 — When `-RunAsCurrentUser` is used, the user's plaintext password is captured via `Get-Credential` and passed as a CLI argument (`--password`). CLI arguments are visible in `Get-Process` / process list for a short window.
  Fix: Use `ConvertFrom-SecureString` with `WinSW`'s `<serviceaccount>` XML block to pass credentials, or document that a dedicated low-privilege service account (not the interactive user) is the recommended approach.

### Minor

- [Minor] `src/app/api/sessions/route.ts`:8-9 — `Number("abc")` returns `NaN`; `Math.min(NaN, 200)` returns `NaN` which Drizzle then passes as `LIMIT NaN` — SQLite treats this as `LIMIT -1` (no limit). No validation that inputs are actually integers.
  Fix: Use `zod` (`z.coerce.number().int().min(0).max(200)`) or an explicit `isNaN` guard with a safe fallback before forwarding to the query layer.

- [Minor] `extension/chrome/sidepanel.js`:53-54 — `apiUrl()` constructs a fetch URL by concatenating user-supplied `baseUrl` input with a path, with no URL validation. A user who accidentally saves a non-localhost URL (e.g. a remote IP) would exfiltrate data outside localhost scope.
  Fix: Validate the saved URL against an allowlist (`localhost`, `127.0.0.1`) before persisting and before making requests. Warn and reject non-localhost values.

- [Minor] `src/lib/privacy/assert-metadata-only.ts`:1-11 — The forbidden key set lacks `"text"`, `"body"`, `"input"`, `"output"`, and `"thinking"` — all keys observed in Claude JSONL assistant messages. A future parser change could inadvertently surface these.
  Fix: Expand the blocklist to include those keys, or switch to an allowlist approach (only permit known-safe metadata keys).

### Suggestions

- [Suggestion] `Dockerfile` — No `HEALTHCHECK` instruction in the Dockerfile itself (only in `compose.yaml`). Users running `docker run` without compose get no health monitoring.
  Fix: Add `HEALTHCHECK CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"` directly in the Dockerfile.

- [Suggestion] `SECURITY.md`:7 — Disclosure contact is "open a GitHub issue" with no email fallback and no PGP key offered. Pre-disclosure issues risk public exposure of vulnerabilities.
  Fix: Add a `security@` alias or GitHub private advisory link as the primary reporting channel; keep the issue tracker as fallback only.

## Summary

The app's localhost-first architecture, non-root Docker user, `compose.yaml` host-binding to `127.0.0.1`, and parameterised Drizzle queries eliminate the most common infrastructure and SQL-injection risks. The privacy guard is implemented correctly and tested. However two issues should be fixed before public release: the CSRF-unprotected POST /sync endpoint (exploitable by any tab the user has open) and the raw filesystem path leakage in sync error responses. The absent security headers and missing CI dependency audit (`npm audit` + Dependabot) are straightforward to add and significantly reduce supply-chain and clickjacking exposure. All other findings are hardening backlog.

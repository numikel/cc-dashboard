# Next.js Developer — Review Report

## Scope
- Files reviewed: `src/app/**` (all routes, route handlers, pages), `next.config.ts`, `package.json`, `tsconfig.json`, `Dockerfile`, `.github/workflows/ci.yml`
- Time: 2026-04-26
- Tools used: Glob, Grep, Read, Context7 (/vercel/next.js v16.2.2)

## Stats
- Critical: 0 | Major: 3 | Minor: 3 | Suggestions: 2

## Findings (sorted Critical → Suggestions)

### Critical
_None._

### Major

- [Major] `src/app/sessions/page.tsx`:1 — Page is a sync Server Component calling `listSessions()` directly but is NOT async; it reads DB synchronously yet lacks `loading.tsx` or Suspense, so any DB hang blocks the entire SSR render with no escape.
  Fix: Make the page `async`, and add a `src/app/sessions/loading.tsx` (or wrap the data-fetching section in `<Suspense fallback={...}>`) so slow DB reads stream gracefully instead of blocking.

- [Major] `Dockerfile`:29-30 — Static assets will NOT be served in production. `public/` is copied to `/app/public` and `.next/static` to `/app/.next/static`, but the standalone `server.js` expects them inside `/app/.next/standalone/public` and `/app/.next/standalone/.next/static` respectively. Docs confirm these paths must be inside the standalone folder.
  Fix: Change COPY destinations to `COPY --from=builder /app/public ./.next/standalone/public` and `COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static`; update `CMD` to `["node", ".next/standalone/server.js"]`.

- [Major] `.github/workflows/ci.yml`:1 — No `.next/cache` restoration between CI runs. Each build starts cold, making CI significantly slower and making cache-related regressions invisible.
  Fix: Add a `cache` step before the Build step: `uses: actions/cache@v4` with `path: .next/cache` and a key based on `hashFiles('**/package-lock.json')`.

### Minor

- [Minor] `src/app/layout.tsx`:5 — Metadata is minimal: `title` is a plain string with no `template` (e.g. `"%s | CC Dashboard"`), no `keywords`, no `robots` (`noindex` recommended for a localhost tool to prevent accidental indexing).
  Fix: Expand the `Metadata` object with `robots: { index: false }` and a title template for child pages.

- [Minor] `src/app/tokens/page.tsx`:1, `src/app/projects/page.tsx`:1, `src/app/sessions/page.tsx`:1 — All three pages call DB query functions synchronously in a non-async Server Component. In Next 16, Server Components CAN be async; the sync pattern works but bypasses streaming and is error-prone (uncaught DB exceptions crash the entire render with no boundary).
  Fix: Convert pages to `async` and add per-directory `error.tsx` (at minimum `src/app/error.tsx`) to catch thrown errors gracefully.

- [Minor] `tsconfig.json`:20 — `"ignoreDeprecations": "6.0"` silences TypeScript 6 deprecation warnings globally, which may hide legitimate issues as TypeScript 6 settles.
  Fix: Review which specific deprecated APIs triggered this flag; suppress only those narrowly if still needed, or remove after verifying clean output.

### Suggestions

- [Suggestions] `next.config.ts`:1 — `experimental.typedRoutes` is not enabled. Typed routes provide compile-time safety on `href` values and are stable in Next 15+.
  Fix: Add `experimental: { typedRoutes: true }` to `next.config.ts` and run `next build` to regenerate route types.

- [Suggestions] `src/app/page.tsx`:1 — The root page renders `<OverviewDashboard />` which is a `"use client"` component fetching all data client-side via SWR. No server-side initial data is passed as props, so the page ships an empty shell on first load (extra round trip). Consider passing initial `stats` snapshot as a Server Component prop.
  Fix: In `page.tsx`, call `getOverviewStats()` server-side and pass the result as `initialData` prop to `OverviewDashboard`, letting SWR hydrate from it instead of fetching on mount.

## Summary

The project is well-structured for Next.js 16: `output: "standalone"` is set, all route handlers correctly declare `runtime = "nodejs"` and `dynamic = "force-dynamic"` (matching the no-cache-by-default behavior of Next 15+/16), TypeScript strict mode is on, and `serverExternalPackages` properly externalizes `better-sqlite3`. The one Docker deployment flaw (wrong static asset destination paths relative to standalone) would cause 404s on all CSS/JS assets in production and must be fixed before release. The missing CI build cache is a developer-experience regression. The absence of `loading.tsx` or `error.tsx` files leaves the app without graceful degradation under DB load or failure.

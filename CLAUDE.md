# Project guidance

## Product intent

This project is a local Claude Code dashboard. It can run through Docker, npm production start, or a Windows WinSW service. It reads Claude Code data from a local data directory and stores only derived metadata in SQLite. Chrome side panel support is a thin client for the same local API.

## Non-negotiable constraints

- Do not store prompt text, assistant response text or full message content.
- Keep the app localhost-first. Do not add remote access or authentication unless explicitly requested.
- Keep Docker data mounts separate: Claude Code data is read-only, SQLite lives in `/data`.
- Keep native runtime data separate too: Claude Code data is read-only in spirit, SQLite should live under a configured `DATA_DIR` or `DATABASE_PATH`.
- Keep the Chrome extension scoped to localhost permissions. Do not request broad host access such as `<all_urls>`.
- Treat Claude Code JSONL as an internal and unstable format. Parser code must be defensive.
- Respect `CLAUDE_CONFIG_DIR` when resolving Claude Code data paths.

## Stack decisions

- Next.js fullstack with route handlers.
- React and TypeScript.
- Drizzle ORM schema with `better-sqlite3`.
- SQLite WAL mode for local read/write concurrency.
- Schema evolution via lightweight `schema_version` helper (`pragma user_version` + `Migration[]` array in `src/lib/db/migrate.ts`). See ADR-0006.
- A single-process database lock for native runtimes to avoid accidental duplicate service instances.
- Zod schemas guard every `JSON.parse` boundary that crosses the trust line (lock files, settings rows, external API responses, active-session JSON).
- SWR for polling.
- Recharts for charts.
- Tailwind CSS and CSS variables for theming.
- Chrome Manifest V3 side panel for lightweight browser access.
- WinSW packaging for Windows background service installs. Do not commit WinSW binaries.

## UI guidance

Use a visual language inspired by Claude Code documentation:

- Warm clay accent.
- Slate and ivory/beige neutral palette.
- Soft borders and rounded cards.
- Spacious overview cards, labeled charts and compact donut indicators for plan usage.
- Dark terminal-like panels for important privacy/status notices.
- Theme modes: `light`, `dark`, `system`.

All UI copy in code should be written in English.

## Validation checklist

Run these after substantive changes:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

For Docker changes, also run:

```powershell
docker compose config
```

For Chrome extension changes, also load `extension/chrome` unpacked in Chrome and verify `http://localhost:3000/api/health` from the side panel.

## Commit style

Use Conventional Commits 1.0.0.

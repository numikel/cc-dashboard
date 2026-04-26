# 0004. Public local runtime and Chrome side panel

## Status

Accepted.

## Context

The dashboard started as a local Docker-first tool. For public GitHub usage, users need a simple native path that keeps the backend available without `npm run dev`, while still preserving the localhost-first privacy model. Some users also want quick browser access without opening the full dashboard tab.

## Decision

Support three runtime surfaces:

- `npm run build` plus `npm run start` for native local production.
- Docker Compose for isolated cross-platform usage.
- WinSW packaging for Windows users who want a background service.

Add a Chrome Manifest V3 side panel as a separate static client in `extension/chrome`. It talks to the existing local API and requests only `localhost` and `127.0.0.1` host permissions.

## Consequences

- The backend remains the only component with file-system and SQLite access.
- The full dashboard and Chrome side panel can run at the same time.
- Public users can choose npm, Docker or Windows service installation.
- WinSW binaries are not committed; users download the wrapper themselves.
- Native runtimes need explicit `DATABASE_PATH` and Claude data directory configuration.
- A database lock file can prevent accidental duplicate managed-service processes from writing to the same SQLite file. It is opt-in through `CC_DASHBOARD_ENABLE_DB_LOCK=1` because Next.js development can use multiple processes.

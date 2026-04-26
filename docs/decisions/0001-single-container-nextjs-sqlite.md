# 0001. Single-container Next.js and SQLite

## Status

Accepted.

## Context

The dashboard is a local, single-user tool. It should run through Docker with minimal operational overhead. Native and Chrome side panel packaging were added later in `0004`.

## Decision

Use one Next.js fullstack application in one container. Store indexed metadata in SQLite through Drizzle ORM and `better-sqlite3`.

## Consequences

- Deployment is simple: `docker compose up --build`.
- Route handlers and UI live in one codebase.
- SQLite is enough for local analytics and easy to back up.
- Docker remains supported, but it is no longer the only public runtime surface.
- If the app becomes multi-user or remote, storage and authentication will need a separate design.

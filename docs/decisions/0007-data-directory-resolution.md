# ADR-0007: Data Directory Resolution Strategy

## Status
Accepted

## Context
The dashboard runs in three modes: Docker container, Windows WinSW service, and direct
`npm start` invocation. Each has different expectations for where the SQLite database
lives. The original implementation defaulted to `/data` (Docker-only), causing
`ENOENT`/`EACCES` errors on native Windows runs when no `DATA_DIR` env var was set.

## Decision
Adopt a three-tier resolution order for `getDataDir()`:
1. `DATA_DIR` env var (explicit override, highest priority)
2. `/data` if it exists at runtime (Docker canonical mount)
3. `os.homedir()/.cc-dashboard` (native fallback)

`DATABASE_PATH` env var continues to bypass `getDataDir()` entirely (unchanged).

A startup writability check warns (but does not crash) if the resolved directory
cannot be written to, giving the user an actionable message.

## Consequences
- Native Windows/Linux/Mac runs no longer require explicit env configuration
- Docker deployments are unaffected (`/data` is detected automatically)
- `~/.cc-dashboard/` is created on first native run (hidden dot-dir convention)
- Symlinks under the data path are NOT followed (see README)

## Links
- ADR-0001: Container deployment strategy

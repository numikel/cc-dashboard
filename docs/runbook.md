# Runbook

## Data directory resolution

The dashboard resolves the SQLite database location in this priority order:

1. `DATABASE_PATH` env var — full path to the `.db` file (highest priority)
2. `DATA_DIR` env var — directory; database is `$DATA_DIR/dashboard.db`
3. `/data` — used automatically when the path exists (Docker canonical mount)
4. `~/.cc-dashboard/` — native fallback (Windows / Linux / Mac)

Set `DATA_DIR` in your `.env` file for native (non-Docker) installs:

```env
DATA_DIR=/home/youruser/.cc-dashboard
```

If the resolved directory is not writable, the dashboard logs a warning at startup
but does not crash. See `docs/decisions/0007-data-directory-resolution.md`.

**Symlinks**: paths inside `CLAUDE_CONFIG_DIR` are not followed. Point directly
to the real path or use a bind-mount.

## Start locally with npm

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run build
npm run start
```

Open `http://localhost:3000`.

## Start locally with Docker

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up --build -d
```

Open `http://localhost:3000`.

## Install as a Windows service

Download WinSW x64 from <https://github.com/winsw/winsw/releases>, save it as `packaging/windows/bin/cc-dashboard-service.exe`, then run from elevated PowerShell:

```powershell
.\packaging\windows\Install-Service.ps1 -RunAsCurrentUser
```

Use `-ClaudeDataDirectory` and `-DataDirectory` when the defaults do not match your machine.

Uninstall:

```powershell
.\packaging\windows\Uninstall-Service.ps1
```

Service logs are under `%LOCALAPPDATA%\CCDashboard\service\logs`.

## Load the Chrome side panel

1. Start the local backend.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked.
5. Select `extension/chrome`.
6. Click the extension icon.

If the panel shows a connection error, confirm the backend URL in the panel settings and check `Invoke-RestMethod http://localhost:3000/api/health`.

## Validate configuration

```powershell
docker compose config
```

## Check health

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

## Trigger sync

`POST /api/sync` requires the `X-Requested-With: cc-dashboard` header (CSRF protection — see [ADR-0004](decisions/0004-public-local-runtime-and-chrome-side-panel.md) and the README API reference).

```powershell
Invoke-RestMethod -Method Post -Headers @{ 'X-Requested-With' = 'cc-dashboard' } http://localhost:3000/api/sync
```

If a sync is already in flight, concurrent calls share the same result — there is no need to throttle the manual trigger.

## Disable the external Anthropic usage API

By default the dashboard reads `~/.claude/.credentials.json` and queries `https://api.anthropic.com/api/oauth/usage` for authoritative session/weekly utilization. To opt out (e.g. on a hardened workstation that should never reach the internet), set:

```powershell
$env:CC_DASHBOARD_DISABLE_USAGE_API = '1'
```

The dashboard then falls back to the local JSONL-based estimate. See [ADR-0005](decisions/0005-external-usage-api.md) for the privacy model.

## Check managed runtime lock

The WinSW service enables `CC_DASHBOARD_ENABLE_DB_LOCK=1`, which creates a lock beside `DATABASE_PATH`, for example `data/dashboard.db.lock`. If the app exits cleanly, the lock is removed. If Windows crashes, the next startup removes stale locks when the recorded process is no longer running.

Do not enable this lock for `npm run dev`. Next.js can use more than one process during development, and SQLite WAL already handles normal local read/write concurrency.

## Verify read-only Claude mount

```powershell
docker exec cc-dashboard sh -c "touch /claude-data/should-fail 2>&1 || true"
```

Expected result: permission denied or read-only file system.

## Back up SQLite

Use SQLite backup through the running container instead of copying the database file directly.

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "D:\Backups\cc-dashboard"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
docker exec cc-dashboard node -e "const Database=require('better-sqlite3'); const db=new Database('/data/dashboard.db'); db.backup('/tmp/dashboard_$timestamp.db').then(()=>db.close())"
docker cp "cc-dashboard:/tmp/dashboard_$timestamp.db" "$backupDir\dashboard_$timestamp.db"
docker exec cc-dashboard rm "/tmp/dashboard_$timestamp.db"
```

## WinSW: managed-service account configuration

The `Install-Service.ps1` script defaults to **LocalSystem** account when `-RunAsCurrentUser` is not specified. This is the simplest path and requires no credential handling.

For production deployments where LocalSystem is too privileged, configure a dedicated low-privilege Windows account:

1. **Create a dedicated service account** (Windows Settings → Accounts → Family & other users):
   - Username: `cc-dashboard-svc` (suggested)
   - Type: Local user, no admin rights
   - Password: strong, machine-specific, stored in your password manager

2. **Grant the account "Log on as a service" right**:
   - Run `secpol.msc`
   - Local Policies → User Rights Assignment → "Log on as a service"
   - Add `cc-dashboard-svc`

3. **Install the service as LocalSystem first** (default `Install-Service.ps1` invocation), then in `services.msc`:
   - Right-click the service → Properties → Log On tab
   - Select "This account" → enter `cc-dashboard-svc` credentials
   - Apply, then Restart the service

4. **Grant filesystem permissions** to the service account on:
   - `%USERPROFILE%\.claude\` (read-only is sufficient)
   - The dashboard data directory (`DATABASE_PATH`'s parent — read-write)

### Why not `-RunAsCurrentUser` with `Get-Credential`?

The current `Install-Service.ps1` `-RunAsCurrentUser` flow passes the password as a CLI argument to `winsw install`, which is briefly visible in process listings. While the window is small (~100ms), credentials in process arguments are a known weakness. The recommended pattern above avoids storing the credential anywhere outside the Windows credential vault.

For one-off local installs by a developer, `-RunAsCurrentUser` remains acceptable. The risk surfaces only on multi-tenant or shared workstations.

## Common Windows path issue

Use forward slashes in `.env`:

```ini
CLAUDE_DATA_PATH=C:/Users/micha/.claude
```

Avoid unescaped backslashes in Compose environment values.

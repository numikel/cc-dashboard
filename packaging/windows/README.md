# Windows service packaging

This folder contains the public Windows service packaging for CC dashboard. The repository does not commit the WinSW binary; users bring their own copy from the official WinSW release page.

## Install

1. Download the current WinSW x64 executable from <https://github.com/winsw/winsw/releases>.
2. Save it as `packaging/windows/bin/cc-dashboard-service.exe`.
3. Open PowerShell as Administrator.
4. Run:

```powershell
.\packaging\windows\Install-Service.ps1 -RunAsCurrentUser
```

`-RunAsCurrentUser` is recommended for a workstation because the service can read the same `%USERPROFILE%\.claude` directory that Claude Code uses. Without it, Windows installs the service under the default service account and you must pass an explicit `-ClaudeDataDirectory` path with matching file permissions.

## Useful options

```powershell
.\packaging\windows\Install-Service.ps1 `
  -Port 3000 `
  -ClaudeDataDirectory "$env:USERPROFILE\.claude" `
  -DataDirectory "$env:LOCALAPPDATA\CCDashboard\data"
```

Use `-SkipBuild` when dependencies are already installed and `npm run build` has already passed.

## Uninstall

```powershell
.\packaging\windows\Uninstall-Service.ps1
```

Uninstalling the service keeps the SQLite data directory. Delete `%LOCALAPPDATA%\CCDashboard\data` manually if you want a clean reset.

## Logs

WinSW writes rolling logs to `%LOCALAPPDATA%\CCDashboard\service\logs` by default.

# cc-dashboard WinSW installer
#
# Default behaviour: installs the service as LocalSystem (no credentials needed).
# The -RunAsCurrentUser switch passes a password via CLI argument to winsw install,
# which is briefly visible in process listings. For production deployments use a
# dedicated low-privilege Windows account and configure it via services.msc after
# install. See docs/runbook.md "WinSW: managed-service account configuration".
#

param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$ServiceDirectory = (Join-Path $env:LOCALAPPDATA "CCDashboard\service"),
  [string]$DataDirectory = (Join-Path $env:LOCALAPPDATA "CCDashboard\data"),
  [string]$ClaudeDataDirectory = (Join-Path $env:USERPROFILE ".claude"),
  [string]$Port = "3000",
  [string]$WinSWPath = (Join-Path $PSScriptRoot "bin\cc-dashboard-service.exe"),
  [switch]$RunAsCurrentUser,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Escape-XmlValue {
  param([string]$Value)
  return [System.Security.SecurityElement]::Escape($Value)
}

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated PowerShell session."
  }
}

Assert-Admin

if (-not (Test-Path $WinSWPath)) {
  throw "WinSW executable not found at '$WinSWPath'. Download WinSW x64 and place it there, or pass -WinSWPath."
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $ServiceDirectory, $DataDirectory | Out-Null

if (-not $SkipBuild) {
  Push-Location $ProjectRoot
  try {
    npm ci
    npm run build
  } finally {
    Pop-Location
  }
}

$serviceExe = Join-Path $ServiceDirectory "cc-dashboard-service.exe"
$serviceXml = Join-Path $ServiceDirectory "cc-dashboard-service.xml"
Copy-Item -Force $WinSWPath $serviceExe

$databasePath = Join-Path $DataDirectory "dashboard.db"
$xml = @"
<service>
  <id>cc-dashboard</id>
  <name>CC dashboard</name>
  <description>Local Claude Code usage dashboard.</description>
  <executable>$(Escape-XmlValue $npm)</executable>
  <arguments>run start</arguments>
  <workingdirectory>$(Escape-XmlValue $ProjectRoot)</workingdirectory>
  <env name="NODE_ENV" value="production" />
  <env name="PORT" value="$(Escape-XmlValue $Port)" />
  <env name="DATA_DIR" value="$(Escape-XmlValue $DataDirectory)" />
  <env name="DATABASE_PATH" value="$(Escape-XmlValue $databasePath)" />
  <env name="CLAUDE_DATA_DIR" value="$(Escape-XmlValue $ClaudeDataDirectory)" />
  <env name="CC_DASHBOARD_ENABLE_DB_LOCK" value="1" />
  <startmode>Automatic</startmode>
  <delayedAutoStart>true</delayedAutoStart>
  <onfailure action="restart" delay="10 sec" />
  <resetfailure>1 hour</resetfailure>
  <logpath>$(Escape-XmlValue (Join-Path $ServiceDirectory "logs"))</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
</service>
"@

Set-Content -Path $serviceXml -Value $xml -Encoding UTF8

$installArgs = @("install", $serviceXml)
if ($RunAsCurrentUser) {
  $credential = Get-Credential -UserName "$env:USERDOMAIN\$env:USERNAME" -Message "Enter the Windows password for the account that should run CC dashboard."
  $password = $credential.GetNetworkCredential().Password
  $installArgs += @("--username", $credential.UserName, "--password", $password)
}

& $serviceExe @installArgs
& $serviceExe start $serviceXml

Write-Host "CC dashboard service installed and started."
Write-Host "Open http://localhost:$Port"

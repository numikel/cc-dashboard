param(
  [string]$ServiceDirectory = (Join-Path $env:LOCALAPPDATA "CCDashboard\service")
)

$ErrorActionPreference = "Stop"

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script from an elevated PowerShell session."
  }
}

Assert-Admin

$serviceExe = Join-Path $ServiceDirectory "cc-dashboard-service.exe"
$serviceXml = Join-Path $ServiceDirectory "cc-dashboard-service.xml"

if (-not (Test-Path $serviceExe)) {
  throw "Service executable not found at '$serviceExe'."
}

try {
  & $serviceExe stop $serviceXml
} catch {
  Write-Warning "Service stop failed or the service was not running: $($_.Exception.Message)"
}

& $serviceExe uninstall $serviceXml

Write-Host "CC dashboard service uninstalled. Data files were left in place."

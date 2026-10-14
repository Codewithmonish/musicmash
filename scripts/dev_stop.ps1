<#
.SYNOPSIS
  Stop the services started by dev_start.ps1.

.DESCRIPTION
  Kills each recorded process together with its children (mvn starts a separate java
  process, npm starts node). As a fallback it also stops whatever still listens on the
  dev ports 8081, 8000 and 5173.

  Usage (from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\dev_stop.ps1
#>
$Root    = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $Root 'logs\dev-pids.json'

if (Test-Path $PidFile) {
    $pids = Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
    foreach ($entry in $pids.PSObject.Properties) {
        & taskkill.exe /T /F /PID $entry.Value 2>&1 | Out-Null
        Write-Host ("Stopped {0,-8} (pid {1})" -f $entry.Name, $entry.Value)
    }
    Remove-Item -LiteralPath $PidFile
}

foreach ($port in 8081, 8000, 5173) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($owner in ($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
        & taskkill.exe /T /F /PID $owner 2>&1 | Out-Null
        Write-Host "Stopped leftover process $owner on port $port"
    }
}
Write-Host 'All dev services stopped.'

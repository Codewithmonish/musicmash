<#
.SYNOPSIS
  Watchdog for the one-click launcher: when the launcher window closes, stop the services it started.

.DESCRIPTION
  scripts\launch.ps1 starts this hidden, passing its own process id and the ids of the AI
  service and Spring. If the launcher ends without stopping them (for example the window was
  closed with the X button), this script stops them so nothing keeps running in the background.
  When you press a key in the launcher instead, the launcher stops the services itself and ends
  this watchdog first.
#>
param(
    [Parameter(Mandatory = $true)][int]$LauncherPid,
    [Parameter(Mandatory = $true)][string]$ServicePids   # comma-separated, e.g. "1234,5678"
)

try { Wait-Process -Id $LauncherPid -ErrorAction Stop } catch { }

foreach ($id in $ServicePids -split ',') {
    if ($id -and (Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue)) {
        & taskkill.exe /PID $id /T /F 2>&1 | Out-Null
    }
}

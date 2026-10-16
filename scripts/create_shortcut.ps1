<#
.SYNOPSIS
  Put a "MusicMash" shortcut on your Desktop that starts MusicMash.bat, with the MusicMash icon.

  Usage (once, from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\create_shortcut.ps1
#>
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Target = Join-Path $Root 'MusicMash.bat'
$Icon = Join-Path $Root 'assets\musicmash.ico'
# GetFolderPath follows a Desktop that OneDrive has moved.
$Desktop = [Environment]::GetFolderPath('Desktop')
$Link = Join-Path $Desktop 'MusicMash.lnk'

foreach ($required in $Target, $Icon) {
    if (-not (Test-Path $required)) { throw "$required not found." }
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($Link)
$shortcut.TargetPath = $Target
$shortcut.WorkingDirectory = $Root
$shortcut.IconLocation = "$Icon,0"
$shortcut.Description = 'Start MusicMash (opens http://localhost:8081)'
$shortcut.WindowStyle = 1   # normal window: it shows progress and "Press any key to stop"
$shortcut.Save()

Write-Host "Created $Link"

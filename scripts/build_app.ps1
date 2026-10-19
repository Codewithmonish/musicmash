<#
.SYNOPSIS
  Build MusicMash as one application: the React app inside the Spring Boot jar.

.DESCRIPTION
  1. npm install, if node_modules is missing or package-lock.json changed.
  2. "npm run build:app" (relative /api base, see music-mash-frontend/.env.app) and copy dist/
     into music-mash-backend/src/main/resources/static (gitignored), if any frontend source
     is newer than the last copy.
  3. "mvn package" (tests skipped; run them with "mvn test"), if any backend source or the
     copied frontend is newer than the jar.
  Each step is skipped when its output is up to date, so a launch with no changes is instant.

  Usage (from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\build_app.ps1          # only what changed
    powershell -ExecutionPolicy Bypass -File scripts\build_app.ps1 -Force   # rebuild everything
#>
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$Root      = Split-Path -Parent $PSScriptRoot
$Frontend  = Join-Path $Root 'music-mash-frontend'
$Backend   = Join-Path $Root 'music-mash-backend'
$Static    = Join-Path $Backend 'src\main\resources\static'
$Jar       = Join-Path $Backend 'target\music-mash-backend-1.0.0.jar'

function Fail($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

# Newest modification time among the given files and folders (recursively).
function Get-Newest([string[]]$paths) {
    $newest = [datetime]::MinValue
    foreach ($path in $paths) {
        if (-not (Test-Path $path)) { continue }
        $item = Get-Item -LiteralPath $path
        $files = if ($item.PSIsContainer) { Get-ChildItem -LiteralPath $path -Recurse -File } else { @($item) }
        foreach ($file in $files) {
            if ($file.LastWriteTime -gt $newest) { $newest = $file.LastWriteTime }
        }
    }
    return $newest
}

function Get-Time($path) {
    if (Test-Path $path) { return (Get-Item -LiteralPath $path).LastWriteTime }
    return [datetime]::MinValue
}

# A runnable Spring Boot jar bundles its libraries under BOOT-INF/. A plain jar (left behind when
# repackaging fails, e.g. because a running Spring held the old file open) cannot start.
function Test-BootJar($path) {
    if (-not (Test-Path $path)) { return $false }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = $null
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
        return [bool]($zip.Entries | Where-Object { $_.FullName -like 'BOOT-INF/lib/*' } | Select-Object -First 1)
    } catch {
        return $false
    } finally {
        if ($zip) { $zip.Dispose() }
    }
}

function Invoke-Step($label, [scriptblock]$command) {
    Write-Host "  $label..."
    $started = Get-Date
    & $command
    if ($LASTEXITCODE -ne 0) { Fail "$label failed (exit code $LASTEXITCODE). See the output above." }
    Write-Host ("  {0} done in {1:N0} s" -f $label, ((Get-Date) - $started).TotalSeconds)
}

# --- 1. npm install ---------------------------------------------------------------------------
$lock = Join-Path $Frontend 'package-lock.json'
$installed = Join-Path $Frontend 'node_modules\.package-lock.json'
if ($Force -or -not (Test-Path $installed) -or (Get-Time $lock) -gt (Get-Time $installed)) {
    Push-Location $Frontend
    try { Invoke-Step 'npm install' { npm.cmd install --no-audit --no-fund } } finally { Pop-Location }
}

# --- 2. Frontend build, copied into Spring's static resources -----------------------------
$frontendSources = 'src', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js',
                   'tailwind.config.js', 'postcss.config.js', '.env.app' | ForEach-Object { Join-Path $Frontend $_ }
$staticIndex = Join-Path $Static 'index.html'
$frontendBuilt = $false
if ($Force -or (Get-Newest $frontendSources) -gt (Get-Time $staticIndex)) {
    Push-Location $Frontend
    try { Invoke-Step 'Frontend build' { npm.cmd run build:app } } finally { Pop-Location }
    if (Test-Path $Static) { Remove-Item -LiteralPath $Static -Recurse -Force }
    Copy-Item -LiteralPath (Join-Path $Frontend 'dist') -Destination $Static -Recurse
    # Stale hashed assets from an older build must not end up in the jar.
    $oldStatic = Join-Path $Backend 'target\classes\static'
    if (Test-Path $oldStatic) { Remove-Item -LiteralPath $oldStatic -Recurse -Force }
    $frontendBuilt = $true
    Write-Host '  Frontend copied into music-mash-backend/src/main/resources/static'
} else {
    Write-Host '  Frontend is up to date.'
}

# --- 3. Spring Boot jar ---------------------------------------------------------------------
$backendSources = (Join-Path $Backend 'src\main'), (Join-Path $Backend 'pom.xml')
if ($Force -or $frontendBuilt -or (Get-Newest $backendSources) -gt (Get-Time $Jar) -or -not (Test-BootJar $Jar)) {
    Push-Location $Backend
    try {
        Write-Host '  Spring jar build...'
        $started = Get-Date
        & mvn.cmd -q -DskipTests package
        if ($LASTEXITCODE -ne 0 -or -not (Test-BootJar $Jar)) {
            # Never leave a half-built jar that looks up to date to the next run.
            if (Test-Path $Jar) { Remove-Item -LiteralPath $Jar -Force }
            Fail 'Spring jar build failed. See the output above (is another MusicMash still running?).'
        }
        Write-Host ("  Spring jar build done in {0:N0} s" -f ((Get-Date) - $started).TotalSeconds)
    } finally { Pop-Location }
} else {
    Write-Host '  Spring jar is up to date.'
}

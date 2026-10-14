<#
.SYNOPSIS
  Start the whole MusicMash stack locally: Spring (8081), FastAPI (8000), Vite (5173).

.DESCRIPTION
  - Loads music-mash-backend/.env into this process's environment variables. Values are
    never printed; only the number of variables loaded is shown.
  - Stops early if MySQL (localhost:3306) is not reachable or a port is already in use.
  - Starts each service as a hidden background process. Output goes to ./logs/<service>.log,
    process IDs to ./logs/dev-pids.json (used by dev_stop.ps1).

  Usage (from the repo root):
    powershell -ExecutionPolicy Bypass -File scripts\dev_start.ps1
#>
$ErrorActionPreference = 'Stop'

$Root     = Split-Path -Parent $PSScriptRoot
$Backend  = Join-Path $Root 'music-mash-backend'
$AI       = Join-Path $Root 'music-mash-ai'
$Frontend = Join-Path $Root 'music-mash-frontend'
$Logs     = Join-Path $Root 'logs'
$PidFile  = Join-Path $Logs 'dev-pids.json'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function Fail($message) {
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

function Test-Port([int]$port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect('127.0.0.1', $port, $null, $null)
        return $connect.AsyncWaitHandle.WaitOne(1000) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# --- 1. Secrets from music-mash-backend/.env (names and values stay hidden) ----------------
$EnvFile = Join-Path $Backend '.env'
if (-not (Test-Path $EnvFile)) { Fail "music-mash-backend/.env not found. Copy .env.example to .env and fill it in." }

$loaded = 0
foreach ($line in Get-Content -LiteralPath $EnvFile) {
    $trimmed = $line.Trim()
    if ($trimmed -eq '' -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
    $name, $value = $trimmed -split '=', 2
    $name = $name.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    $loaded++
}
Write-Host "Loaded $loaded variables from music-mash-backend/.env (values not shown)."

foreach ($required in 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET') {
    if (-not [Environment]::GetEnvironmentVariable($required, 'Process')) {
        Fail "$required is missing from music-mash-backend/.env."
    }
}

# --- 2. Preconditions -------------------------------------------------------------------
if (-not (Test-Port 3306)) {
    Fail "MySQL is not reachable on localhost:3306. Start it (e.g. 'Start-Service MySQL80' as admin) and try again."
}
# Listening sockets on IPv4 or IPv6 (Vite binds only ::1 for "localhost").
foreach ($port in 8081, 8000, 5173) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        Fail "Port $port is already in use. Run scripts\dev_stop.ps1 first."
    }
}
$Python = Join-Path $AI '.venv\Scripts\python.exe'
if (-not (Test-Path $Python)) {
    Fail "music-mash-ai/.venv not found. Create it: cd music-mash-ai; python -m venv .venv; .venv\Scripts\pip install -r requirements-dev.txt"
}

# Both services must share one upload folder: Spring writes <upload-dir>/<file>, and the AI
# service reads <UPLOAD_DIR>/<file> by file name (music-mash-ai/app/core/uploads.py).
$Uploads = Join-Path $Backend 'uploads'
New-Item -ItemType Directory -Force -Path $Uploads | Out-Null
$env:UPLOAD_DIR = $Uploads

# --- 3. Start the services -----------------------------------------------------------------
function Start-Service-Process($name, $file, $arguments, $workingDir) {
    $out = Join-Path $Logs "$name.log"
    $err = Join-Path $Logs "$name.err.log"
    $process = Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $workingDir `
        -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden -PassThru
    Write-Host ("Started {0,-8} pid {1,-6} logs\{0}.log" -f $name, $process.Id)
    return $process.Id
}

$pids = [ordered]@{
    spring  = Start-Service-Process 'spring'  'mvn.cmd'  @('-q', 'spring-boot:run') $Backend
    fastapi = Start-Service-Process 'fastapi' $Python    @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000') $AI
    vite    = Start-Service-Process 'vite'    'npm.cmd'  @('run', 'dev', '--', '--port', '5173', '--strictPort') $Frontend
}
$pids | ConvertTo-Json | Set-Content -LiteralPath $PidFile

# --- 4. Wait until each one answers ---------------------------------------------------------
function Wait-Http($name, $url, [int]$timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null
            return $true
        } catch {
            # Any HTTP answer (even 401/403/404) means the server is up.
            if ($_.Exception.Response) { return $true }
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "  $name did not answer within $timeoutSeconds s. Last log lines:" -ForegroundColor Yellow
    Get-Content (Join-Path $Logs "$name.log"), (Join-Path $Logs "$name.err.log") -Tail 15 -ErrorAction SilentlyContinue | Out-Host
    return $false
}

Write-Host 'Waiting for services (first Spring/librosa start can take a few minutes)...'
# "localhost" (not 127.0.0.1): Vite listens on IPv6 ::1 only.
$ok = (Wait-Http 'fastapi' 'http://localhost:8000/health' 180) -and
      (Wait-Http 'spring'  'http://localhost:8081/api/auth/me' 300) -and
      (Wait-Http 'vite'    'http://localhost:5173/' 120)

if (-not $ok) { Fail 'A service did not start. See the logs above; stop everything with scripts\dev_stop.ps1.' }

Write-Host ''
Write-Host 'All services are up:' -ForegroundColor Green
Write-Host '  Frontend  http://localhost:5173'
Write-Host '  Spring    http://localhost:8081'
Write-Host '  AI docs   http://localhost:8000/docs'
Write-Host 'Stop everything with: powershell -ExecutionPolicy Bypass -File scripts\dev_stop.ps1'

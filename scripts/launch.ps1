<#
.SYNOPSIS
  One-click MusicMash: set up (first run), build what changed, start the AI service and Spring,
  open http://localhost:8081, and stop everything when you press a key or close the window.

.DESCRIPTION
  Started by MusicMash.bat in the repo root (double-click it, or the Desktop shortcut).

  1. First run only: Python venv + pip install, AI knowledge index. Re-runs pip if
     requirements.txt changed.
  2. scripts\build_app.ps1: npm install / frontend build / Spring jar, each only if its sources
     changed since the last build.
  3. MySQL must answer on localhost:3306; if its Windows service is stopped, try to start it.
  4. music-mash-backend\.env is loaded for Spring and music-mash-ai\.env for the AI service.
     Values are never printed.
  5. Both services start hidden, logging to .\logs\. A small watchdog (scripts\stop_on_exit.ps1)
     stops them if this window is closed, so nothing is left running in the background.
  6. Waits for both health checks, then opens the browser.
#>
$ErrorActionPreference = 'Stop'
$Started = Get-Date
try { $Host.UI.RawUI.WindowTitle = 'MusicMash launcher' } catch { }

$Root     = Split-Path -Parent $PSScriptRoot
$Backend  = Join-Path $Root 'music-mash-backend'
$AI       = Join-Path $Root 'music-mash-ai'
$Logs     = Join-Path $Root 'logs'
$State    = Join-Path $Root '.musicmash'
$Python   = Join-Path $AI '.venv\Scripts\python.exe'
$Jar      = Join-Path $Backend 'target\music-mash-backend-1.0.0.jar'
$AppUrl   = 'http://localhost:8081'
New-Item -ItemType Directory -Force -Path $Logs, $State | Out-Null
# Everything this window shows is also kept in logs\launcher.log (no secret values are ever printed).
try { Start-Transcript -LiteralPath (Join-Path $Logs 'launcher.log') -Force | Out-Null } catch { }

# --- Helpers -----------------------------------------------------------------------------------

function Wait-AnyKey {
    try {
        while ([Console]::KeyAvailable) { [void][Console]::ReadKey($true) }
        [void][Console]::ReadKey($true)
    } catch {
        [void](Read-Host)   # no interactive console (input redirected)
    }
}

function Fail($message, [string[]]$help = @()) {
    Write-Host ''
    Write-Host "MusicMash could not start: $message" -ForegroundColor Red
    foreach ($line in $help) { if ($line) { Write-Host "  $line" -ForegroundColor Yellow } }
    Write-Host ''
    Write-Host 'Press any key to close this window.'
    try { Stop-Transcript | Out-Null } catch { }
    Wait-AnyKey
    exit 1
}

function Step($text) { Write-Host "> $text" -ForegroundColor Cyan }

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

# HTTP status code of a GET, or 0 if nothing answers. Plain .NET, so the expected
# "connection refused" while a service starts doesn't fill logs\launcher.log with errors.
function Get-HttpStatus($url) {
    try {
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Timeout = 3000
        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $response.Close()
        return $status
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

function Require-Command($name, $what, $url) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Fail "$what was not found ('$name' is not on PATH)." @("Install it from $url, then run MusicMash again.")
    }
}

# KEY=VALUE lines -> hashtable. Values are never printed.
function Read-EnvFile($path) {
    $vars = @{}
    if (-not (Test-Path $path)) { return $vars }
    foreach ($line in Get-Content -LiteralPath $path) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
        $name, $value = $trimmed -split '=', 2
        $vars[$name.Trim()] = $value.Trim().Trim('"').Trim("'")
    }
    return $vars
}

function Set-ProcessEnv($vars) {
    foreach ($name in $vars.Keys) { [Environment]::SetEnvironmentVariable($name, $vars[$name], 'Process') }
}

function Clear-ProcessEnv($vars) {
    foreach ($name in $vars.Keys) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
}

function Start-Hidden($name, $file, [string[]]$arguments, $workingDir) {
    $out = Join-Path $Logs "$name.log"
    $err = Join-Path $Logs "$name.err.log"
    return Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $workingDir `
        -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden -PassThru
}

function Stop-Tree($process) {
    if ($process -and -not $process.HasExited) {
        & taskkill.exe /PID $process.Id /T /F 2>&1 | Out-Null
    }
}

# Free a port held by an earlier MusicMash run; refuse to touch any other program.
function Clear-Port([int]$port) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($owner in ($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
        $info = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue
        $commandLine = if ($info) { [string]$info.CommandLine } else { '' }
        if ($commandLine -like "*$Root*" -or $commandLine -like '*music-mash*') {
            Write-Host "  Port $port is held by an earlier MusicMash run (pid $owner); stopping it."
            & taskkill.exe /PID $owner /T /F 2>&1 | Out-Null
        } else {
            $name = if ($info) { $info.Name } else { 'an unknown program' }
            Fail "Port $port is already used by $name (pid $owner)." @(
                "Close that program, or stop it in Task Manager (Details tab, PID $owner), then run MusicMash again.")
        }
    }
    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 300
    }
}

function Show-LogTail($name) {
    foreach ($file in "$name.err.log", "$name.log") {
        $path = Join-Path $Logs $file
        if ((Test-Path $path) -and (Get-Item $path).Length -gt 0) {
            Write-Host "  Last lines of logs\$file :" -ForegroundColor Yellow
            Get-Content -LiteralPath $path -Tail 12 | ForEach-Object { Write-Host "    $_" }
        }
    }
}

Write-Host ''
Write-Host 'MusicMash' -ForegroundColor White
Write-Host ''

# --- 1. First-run setup: Python environment and AI knowledge index -----------------------------
Require-Command 'java' 'Java 17 or newer' 'https://adoptium.net/'
if (-not (Test-Path $Python)) {
    Step 'First run: creating the Python environment for the AI service (10-15 minutes, downloads about 1 GB)'
    if (Get-Command 'py' -ErrorAction SilentlyContinue) { & py -3 -m venv (Join-Path $AI '.venv') }
    else {
        Require-Command 'python' 'Python 3.11 or newer' 'https://www.python.org/downloads/'
        & python -m venv (Join-Path $AI '.venv')
    }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Python)) { Fail 'Creating the Python virtual environment failed.' }
}
$requirements = Join-Path $AI 'requirements.txt'
$pipStamp = Join-Path $State 'requirements.sha256'
$requirementsHash = (Get-FileHash -LiteralPath $requirements -Algorithm SHA256).Hash
if (-not (Test-Path $pipStamp) -or (Get-Content -LiteralPath $pipStamp) -ne $requirementsHash) {
    Step 'Installing Python packages for the AI service'
    & $Python -m pip install --disable-pip-version-check -r $requirements
    if ($LASTEXITCODE -ne 0) { Fail 'pip install failed.' @('Scroll up for the error. Check your internet connection and run MusicMash again.') }
    Set-Content -LiteralPath $pipStamp -Value $requirementsHash
}
if (-not (Test-Path (Join-Path $AI 'chroma_db'))) {
    Step 'Building the AI coach knowledge index (downloads a 90 MB embedding model once)'
    Push-Location $AI
    try { & $Python scripts\build_knowledge_index.py 2>&1 | Out-File -LiteralPath (Join-Path $Logs 'knowledge_index.log') -Encoding utf8 }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Host '  Index build failed (see logs\knowledge_index.log); the coach will retry on first use.' -ForegroundColor Yellow }
}

# --- 2. Build what changed: frontend into Spring, Spring jar ---------------------------------------
Step 'Checking the app build'
if (-not (Test-Path $Jar) -or -not (Test-Path (Join-Path $Backend 'src\main\resources\static\index.html'))) {
    Require-Command 'npm' 'Node.js 18 or newer' 'https://nodejs.org/'
    Require-Command 'mvn' 'Apache Maven' 'https://maven.apache.org/download.cgi'
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build_app.ps1')
if ($LASTEXITCODE -ne 0) { Fail 'The app build failed.' @('Scroll up for the error. If npm or mvn is missing, install it and run MusicMash again.') }

# --- 3. Secrets (values never printed) -----------------------------------------------------------
$springEnv = Read-EnvFile (Join-Path $Backend '.env')
if ($springEnv.Count -eq 0) {
    Fail 'music-mash-backend\.env is missing or empty.' @('Copy music-mash-backend\.env.example to .env and fill in DB_USERNAME, DB_PASSWORD and JWT_SECRET.')
}
foreach ($required in 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET') {
    if (-not $springEnv.ContainsKey($required) -or -not $springEnv[$required]) { Fail "$required is missing from music-mash-backend\.env." }
}
$aiEnv = Read-EnvFile (Join-Path $AI '.env')
if (-not $aiEnv.ContainsKey('LLM_API_KEY') -or -not $aiEnv['LLM_API_KEY']) {
    Write-Host '  No LLM_API_KEY in music-mash-ai\.env: the AI coach will run in basic mode.' -ForegroundColor DarkGray
}

# --- 4. MySQL ----------------------------------------------------------------------------------
Step 'Checking MySQL'
if (-not (Test-Port 3306)) {
    $service = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'MySQL*' } | Select-Object -First 1
    if (-not $service) {
        Fail 'MySQL is not running on localhost:3306, and no MySQL Windows service was found.' @(
            'Start MySQL the way you installed it (MySQL Installer, XAMPP, ...), then run MusicMash again.')
    }
    Write-Host "  MySQL is not running; starting the '$($service.Name)' service..."
    try {
        Start-Service -Name $service.Name -ErrorAction Stop
    } catch {
        Fail "MySQL is stopped and starting the '$($service.Name)' service needs administrator rights." @(
            'Do ONE of these, then run MusicMash again:',
            "  a) Press Win+R, type services.msc, Enter. Find '$($service.Name)', right-click it, Start.",
            "     (Tip: double-click it and set Startup type to Automatic so it always starts with Windows.)",
            "  b) Right-click the Start button, Terminal (Admin), and run:  Start-Service $($service.Name)")
    }
    $deadline = (Get-Date).AddSeconds(30)
    while (-not (Test-Port 3306) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }
    if (-not (Test-Port 3306)) { Fail "The '$($service.Name)' service started but MySQL is not answering on port 3306." }
}
Write-Host '  MySQL is reachable.'

# --- 5. Ports ------------------------------------------------------------------------------------
Clear-Port 8081
Clear-Port 8000

# --- 6. Start both services ------------------------------------------------------------------------
Step 'Starting the AI service and Spring'
$uploads = Join-Path $Backend 'uploads'
New-Item -ItemType Directory -Force -Path $uploads | Out-Null

Set-ProcessEnv $aiEnv
$env:UPLOAD_DIR = $uploads   # both services share one upload folder
$fastapi = Start-Hidden 'fastapi' $Python @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000') $AI
Clear-ProcessEnv $aiEnv

Set-ProcessEnv $springEnv
$spring = Start-Hidden 'spring' 'java' @('-jar', "`"$Jar`"") $Backend
Clear-ProcessEnv $springEnv

# If this window is closed, the watchdog stops both services.
$watchdog = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$(Join-Path $PSScriptRoot 'stop_on_exit.ps1')`"",
    '-LauncherPid', $PID, '-ServicePids', "$($fastapi.Id),$($spring.Id)")

try {
    # --- 7. Wait for both health checks -------------------------------------------------------------
    $checks = @(
        @{ Name = 'fastapi'; Label = 'AI service'; Url = 'http://127.0.0.1:8000/health'; Process = $fastapi; Ok = $false },
        @{ Name = 'spring';  Label = 'Spring';     Url = "$AppUrl/api/public/health";    Process = $spring;  Ok = $false }
    )
    $timeout = 180
    $deadline = (Get-Date).AddSeconds($timeout)
    while (($checks | Where-Object { -not $_.Ok }) -and (Get-Date) -lt $deadline) {
        foreach ($check in $checks | Where-Object { -not $_.Ok }) {
            if ($check.Process.HasExited) {
                Show-LogTail $check.Name
                Fail "$($check.Label) stopped while starting." @("Full log: logs\$($check.Name).log and logs\$($check.Name).err.log")
            }
            if ((Get-HttpStatus $check.Url) -eq 200) {
                $check.Ok = $true
                Write-Host ("  {0} is ready ({1:N0} s)" -f $check.Label, ((Get-Date) - $Started).TotalSeconds)
            }
        }
        Start-Sleep -Milliseconds 700
    }
    foreach ($check in $checks | Where-Object { -not $_.Ok }) {
        Show-LogTail $check.Name
        $extra = if ($check.Name -eq 'spring') { 'If the log mentions the database, check DB_USERNAME/DB_PASSWORD in music-mash-backend\.env.' } else { '' }
        Fail "$($check.Label) did not become ready within $timeout s." @("Full log: logs\$($check.Name).log and logs\$($check.Name).err.log", $extra)
    }

    # --- 8. Open the app and wait --------------------------------------------------------------------
    Start-Process $AppUrl
    Write-Host ''
    Write-Host ("MusicMash is running at $AppUrl (ready in {0:N0} s)." -f ((Get-Date) - $Started).TotalSeconds) -ForegroundColor Green
    Write-Host 'Press any key to stop.'
    Write-Host 'Logs: logs\spring.log and logs\fastapi.log' -ForegroundColor DarkGray

    $interactive = $true
    try { while ([Console]::KeyAvailable) { [void][Console]::ReadKey($true) } } catch { $interactive = $false }
    if ($interactive) {
        while (-not [Console]::KeyAvailable) {
            foreach ($check in $checks) {
                if ($check.Process.HasExited) {
                    Write-Host ''
                    Write-Host "$($check.Label) stopped unexpectedly. See logs\$($check.Name).log" -ForegroundColor Red
                    Show-LogTail $check.Name
                    Write-Host 'Press any key to close.'
                    Wait-AnyKey
                    return
                }
            }
            Start-Sleep -Milliseconds 500
        }
        [void][Console]::ReadKey($true)
    } else {
        [void](Read-Host)
    }
} finally {
    Write-Host 'Stopping MusicMash...'
    Stop-Tree $watchdog
    Stop-Tree $spring
    Stop-Tree $fastapi
    Write-Host 'MusicMash stopped.'
    try { Stop-Transcript | Out-Null } catch { }
}

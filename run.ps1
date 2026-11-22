param(
    [switch]$Dev,
    [switch]$Seed,
    [switch]$Test,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   VEYRASENSE — Intelligent Sensor Reliability Platform   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Get-Location

# 1. Check Python and Virtual Environment
$VenvPython = Join-Path $RootDir "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[1/4] Setting up Python 3.12 virtual environment in backend\.venv..." -ForegroundColor Yellow
    py -3.12 -m venv backend\.venv
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r backend\requirements.txt
} else {
    Write-Host "[1/4] Python virtual environment verified." -ForegroundColor Green
}

# 2. Database Migrations
Write-Host "[2/4] Applying SQLite database migrations..." -ForegroundColor Yellow
$AlembicExe = Join-Path $RootDir "backend\.venv\Scripts\alembic.exe"
Push-Location backend
try {
    & $AlembicExe upgrade head
} finally {
    Pop-Location
}

# 3. Optional Seed / Test
if ($Seed) {
    Write-Host "[-] Seeding database with initial demonstration fleet..." -ForegroundColor Yellow
    Push-Location backend
    try {
        & $VenvPython -m app.cli.seed
    } finally {
        Pop-Location
    }
}

if ($Test) {
    Write-Host "[-] Running backend automated test suite..." -ForegroundColor Yellow
    $PytestExe = Join-Path $RootDir "backend\.venv\Scripts\pytest.exe"
    Push-Location backend
    try {
        & $PytestExe tests -v
    } finally {
        Pop-Location
    }
    exit 0
}

# 4. Check Frontend Dependencies
Write-Host "[3/4] Verifying frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Push-Location frontend
    try {
        npm install
    } finally {
        Pop-Location
    }
}

# 5. Launch Services
Write-Host "[4/4] Starting VeyraSense services..." -ForegroundColor Green
Write-Host "  -> Backend API:  http://localhost:$BackendPort (Docs: http://localhost:$BackendPort/api/v1/docs)" -ForegroundColor Cyan
Write-Host "  -> Frontend UI:  http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to terminate both servers." -ForegroundColor Gray
Write-Host "----------------------------------------------------------"

# Launch Backend in Background Job
$BackendJob = Start-Job -ScriptBlock {
    param($Root, $Port)
    Set-Location $Root
    $Python = Join-Path $Root "backend\.venv\Scripts\python.exe"
    Set-Location backend
    & $Python -m uvicorn app.main:app --host 0.0.0.0 --port $Port
} -ArgumentList $RootDir, $BackendPort

# Launch Frontend in foreground or job
try {
    Push-Location frontend
    if ($Dev) {
        npm run dev -- --port $FrontendPort --host
    } else {
        npm run build
        npx vite preview --port $FrontendPort --host
    }
} finally {
    Pop-Location
    Write-Host "Stopping backend service..." -ForegroundColor Yellow
    Stop-Job $BackendJob -ErrorAction SilentlyContinue
    Remove-Job $BackendJob -ErrorAction SilentlyContinue
    Write-Host "VeyraSense services stopped." -ForegroundColor Green
}

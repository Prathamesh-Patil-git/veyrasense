@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo    VEYRASENSE -- Intelligent Sensor Reliability Platform  
echo ==========================================================

cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
    echo [1/3] Creating Python 3.12 virtual environment...
    py -3.12 -m venv backend\.venv
    backend\.venv\Scripts\python.exe -m pip install --upgrade pip
    backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
) else (
    echo [1/3] Python virtual environment verified.
)

echo [2/3] Applying database migrations...
cd backend
.venv\Scripts\alembic.exe upgrade head
cd ..

echo [3/3] Launching FastAPI Backend and Vite Frontend...
start "VeyraSense Backend (Port 8000)" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "VeyraSense Frontend (Port 5173)" cmd /k "cd frontend && npm run dev -- --port 5173"

echo.
echo VeyraSense is launching!
echo   - Backend API:  http://localhost:8000
echo   - API Swagger:  http://localhost:8000/api/v1/docs
echo   - Frontend App: http://localhost:5173
echo.
pause

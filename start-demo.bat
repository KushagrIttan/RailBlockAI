@echo off
REM RailBlock AI — one-command demo startup (Windows).
REM Starts the optimizer (:8000), the .NET API (:5053) and the Vite frontend (:5173),
REM each in its own window, then health-checks all three. Safe to re-run:
REM services that are already up are skipped, not duplicated.
REM
REM Ports/URLs can be overridden with environment variables before running:
REM   set OPT_PORT=8000  ^&  set API_URLS=http://localhost:5053  ^&  set FE_PORT=5173
REM Config files: backend\optimization-engine\.env (DOTNET_API_BASE),
REM               frontend\.env (VITE_API_TARGET).
setlocal EnableExtensions
cd /d "%~dp0"

if "%OPT_PORT%"=="" set OPT_PORT=8000
if "%API_URLS%"=="" set API_URLS=http://localhost:5053
if "%FE_PORT%"=="" set FE_PORT=5173

where python >nul 2>nul || (echo [ERR] python not found on PATH. Install Python 3.11+ ^& pip install -r backend\requirements.txt & exit /b 1)
where dotnet >nul 2>nul || (echo [ERR] dotnet not found on PATH. Install the .NET 10 SDK. & exit /b 1)
where npm >nul 2>nul    || (echo [ERR] npm not found on PATH. Install Node 18+. & exit /b 1)
where curl >nul 2>nul   || (echo [ERR] curl not found. Windows 10/11 ships it in System32. & exit /b 1)

curl -s -m 2 -o nul -w "%%{http_code}" "http://127.0.0.1:%OPT_PORT%/health" | findstr /r "^200$" >nul
if %errorlevel%==0 (echo [SKIP] optimizer already up on :%OPT_PORT%) else (echo [1/3] Starting optimization engine on :%OPT_PORT% ... & start "RailBlock-Optimizer" /d "%~dp0backend\optimization-engine" cmd /k python -m uvicorn main:app --host 127.0.0.1 --port %OPT_PORT%)

curl -s -m 2 -o nul -w "%%{http_code}" "%API_URLS%/api/optimization/data" | findstr /r "^200$" >nul
if %errorlevel%==0 (echo [SKIP] .NET API already up at %API_URLS%) else (echo [2/3] Starting .NET API on %API_URLS% ... & start "RailBlock-API" /d "%~dp0backend\RailBlockAI.Api" cmd /k set ASPNETCORE_URLS=%API_URLS% ^&^& dotnet run --launch-profile http --no-launch-browser)

curl -s -m 2 -o nul -w "%%{http_code}" "http://127.0.0.1:%FE_PORT%/" | findstr /r "^200$" >nul
if %errorlevel%==0 (echo [SKIP] frontend already up on :%FE_PORT%) else (echo [3/3] Starting frontend on :%FE_PORT% ... & start "RailBlock-Frontend" /d "%~dp0frontend" cmd /k npm run dev -- --host 127.0.0.1 --port %FE_PORT%)

echo.
echo Waiting for services to come up (first run builds .NET + Vite — can take a minute)...
call :waitfor "optimizer" "http://127.0.0.1:%OPT_PORT%/health" || exit /b 1
call :waitfor ".NET API"  "%API_URLS%/api/optimization/data"  || exit /b 1
call :waitfor "frontend"  "http://127.0.0.1:%FE_PORT%/"        || exit /b 1

echo.
echo ============================================================
echo  RailBlock AI is live:
echo    Dashboard : http://127.0.0.1:%FE_PORT%/
echo    .NET API  : %API_URLS%/swagger
echo    Optimizer : http://127.0.0.1:%OPT_PORT%/docs
echo  To stop everything, run stop-demo.bat
echo ============================================================
exit /b 0

:waitfor
set "wname=%~1"
set "wurl=%~2"
for /l %%i in (1,1,45) do (
  curl -s -m 3 -o nul -w "%%{http_code}" "%wurl%" | findstr /r "^200$" >nul && (echo [OK] %wname% is up ^(%wurl%^) & exit /b 0)
  ping -n 3 127.0.0.1 >nul
)
echo [ERR] %wname% did not respond at %wurl% within ~90s. Check its window for errors.
exit /b 1

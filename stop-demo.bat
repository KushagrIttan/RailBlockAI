@echo off
REM RailBlock AI — stop all demo services (ports 8000 / 5053 / 5173 by default).
REM Honors OPT_PORT / FE_PORT and API_URLS port if set; otherwise uses defaults.
setlocal EnableExtensions

if "%OPT_PORT%"=="" set OPT_PORT=8000
if "%FE_PORT%"=="" set FE_PORT=5173
set "API_PORT=5053"

for %%P in (%OPT_PORT% %API_PORT% %FE_PORT%) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%P" ^| findstr "LISTENING"') do (
    echo Stopping PID %%a on port %%P ...
    taskkill /F /PID %%a >nul 2>nul
  )
)
echo Done. (Service windows may stay open — close them manually.)

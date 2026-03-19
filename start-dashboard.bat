@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo     Dev Dashboard - Startup Helper
echo ========================================

:: Resolve the repository root based on this script location
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Validate required tools early
where node >nul 2>&1
if errorlevel 1 (
	echo [ERROR] Node.js is not installed or not in PATH.
	echo Install Node.js 18+ and run this script again.
	pause
	exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
	echo [ERROR] npm is not installed or not in PATH.
	echo Reinstall Node.js ^(includes npm^) and run this script again.
	pause
	exit /b 1
)

if not exist "backend\" (
	echo [ERROR] backend folder was not found in:
	echo %CD%
	pause
	exit /b 1
)

if not exist "frontend\" (
	echo [ERROR] frontend folder was not found in:
	echo %CD%
	pause
	exit /b 1
)

:: Install dependencies only when node_modules is missing
if not exist "backend\node_modules\" (
	echo [INFO] Installing backend dependencies...
	pushd backend
	call npm install
	if errorlevel 1 (
		echo [ERROR] Backend dependency installation failed.
		popd
		pause
		exit /b 1
	)
	popd
)

if not exist "frontend\node_modules\" (
	echo [INFO] Installing frontend dependencies...
	pushd frontend
	call npm install
	if errorlevel 1 (
		echo [ERROR] Frontend dependency installation failed.
		popd
		pause
		exit /b 1
	)
	popd
)

echo [INFO] Starting backend in background on http://localhost:6001 ...
set "BACKEND_UP="
set "PORT_6001_BUSY="
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 6001 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 set "PORT_6001_BUSY=1"

if defined PORT_6001_BUSY (
	echo [WARN] Port 6001 is already in use. Checking if backend API supports required routes...
	powershell -NoProfile -Command "try { $null = Invoke-RestMethod -Uri 'http://localhost:6001/projects' -TimeoutSec 2; $null = Invoke-RestMethod -Uri 'http://localhost:6001/system/overview' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
	if not errorlevel 1 (
		echo [INFO] Existing backend on port 6001 is healthy. Reusing it.
		set "BACKEND_UP=1"
		goto :backend_ready
	)

	echo [ERROR] Port 6001 is in use by another process or an outdated backend instance.
	set "PORT_PID="
	for /f "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:":6001 .*LISTENING"') do (
		if not defined PORT_PID set "PORT_PID=%%P"
	)
	if defined PORT_PID (
		echo [ERROR] Process using port 6001: PID !PORT_PID!
		echo(!PORT_PID!| findstr /R "^[0-9][0-9]*$" >nul
		if not errorlevel 1 (
			tasklist /FI "PID eq !PORT_PID!"
		) else (
			echo [WARN] PID value is not numeric. Use netstat manually to inspect.
		)
	) else (
		echo [WARN] Could not determine PID for port 6001. Use netstat manually to inspect.
	)
	echo [ERROR] Stop that process and run this script again so Dev Dashboard backend can start.
	pause
	exit /b 1
)

set "BACKEND_LOG=%SCRIPT_DIR%backend\backend-start.log"
set "BACKEND_ERR_LOG=%SCRIPT_DIR%backend\backend-start.err.log"
if exist "%BACKEND_LOG%" del /f /q "%BACKEND_LOG%" >nul 2>&1
if exist "%BACKEND_ERR_LOG%" del /f /q "%BACKEND_ERR_LOG%" >nul 2>&1
powershell -NoProfile -Command "Start-Process -FilePath 'node.exe' -ArgumentList 'server.js' -WorkingDirectory '%SCRIPT_DIR%backend' -WindowStyle Hidden -RedirectStandardOutput '%BACKEND_LOG%' -RedirectStandardError '%BACKEND_ERR_LOG%'"

echo [INFO] Waiting for backend to initialize...
for /L %%I in (1,1,12) do (
	powershell -NoProfile -Command "try { $null = Invoke-RestMethod -Uri 'http://localhost:6001/projects' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
	if not errorlevel 1 (
		set "BACKEND_UP=1"
		goto :backend_ready
	)
	timeout /t 1 /nobreak >nul
)

:backend_ready
if not defined BACKEND_UP (
	echo [ERROR] Backend did not start on port 6001.
	echo [ERROR] Check log: %BACKEND_LOG%
	if exist "%BACKEND_LOG%" type "%BACKEND_LOG%"
	if exist "%BACKEND_ERR_LOG%" (
		echo [ERROR] Check stderr log: %BACKEND_ERR_LOG%
		type "%BACKEND_ERR_LOG%"
	)
	pause
	exit /b 1
)

set "FRONTEND_UP="
set "PORT_5173_BUSY="
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 set "PORT_5173_BUSY=1"

if defined PORT_5173_BUSY (
	echo [WARN] Port 5173 is already in use. Checking if frontend is reachable...
	powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
	if not errorlevel 1 (
		echo [INFO] Existing frontend on port 5173 is reachable. Reusing it.
		set "FRONTEND_UP=1"
	) else (
		echo [ERROR] Port 5173 is in use by another process.
		echo [ERROR] Stop that process, then run this script again.
		pause
		exit /b 1
	)
)

echo [INFO] Opening dashboard in browser...
start "" "http://localhost:5173"

if defined FRONTEND_UP exit /b 0

echo [INFO] Starting frontend in this window on http://localhost:5173 ...
echo [INFO] Press Ctrl+C in this window to stop the frontend server.
cd /d "%SCRIPT_DIR%frontend"
call npm run dev -- --port 5173 --strictPort

exit /b 0
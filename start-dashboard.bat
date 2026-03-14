@echo off
echo Starting Developer Dashboard...

:: Navigate to your workspace directory
cd /d "d:\local-dashboard\dev-dashboard"

:: Start the backend on port 6001
echo Starting Backend...
cd backend
set PORT=6001
start "Dashboard Backend" cmd /k "node server.js"

:: Go back and into frontend
cd ..\frontend

:: Start the Vite frontend on port 6002
echo Starting Frontend...
start "Dashboard Frontend" cmd /k "npm run dev -- --port 6002"

:: Wait a few seconds to let both servers start up
timeout /t 3 /nobreak > NUL

:: Open the frontend in the default web browser
echo Opening frontend in browser...
start http://localhost:6002
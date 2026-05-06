@echo off
title Loona Dev Launcher
color 0A

echo ============================================
echo    LOONA - Local Development Launcher
echo ============================================
echo.

:: ── 1. Start Backend ─────────────────────────────────────────────────────────
echo [1/2] Starting Backend Server (port 5000)...
start "Loona Backend" cmd /k "cd /d %~dp0server && npm run dev"

:: Give the server 3 seconds to boot before starting the client
timeout /t 3 /nobreak > nul

:: ── 2. Start Frontend ────────────────────────────────────────────────────────
echo [2/2] Starting Expo Frontend...
start "Loona Frontend" cmd /k "cd /d %~dp0client && npx expo start -c --web"

echo.
echo ============================================
echo  Both servers are starting up!
echo.
echo  Backend : http://localhost:5000
echo  Health  : http://localhost:5000/health
echo  Frontend: http://localhost:8081  (web)
echo  Expo Go : Scan QR code in the Expo window
echo ============================================
echo.
pause

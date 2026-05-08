@echo off
title Loona Dev Launcher
color 0A

echo ============================================
echo    LOONA - Local Development Launcher
echo ============================================
echo.

:: ── Detect LAN IP ─────────────────────────────────────────────────────────────
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set LAN_IP=%%i
    goto :found_ip
)
:found_ip
set LAN_IP=%LAN_IP: =%

echo  Detected LAN IP: %LAN_IP%
echo  Update client\.env with: EXPO_PUBLIC_API_URL=http://%LAN_IP%:5000/api
echo.

:: ── 1. Start Backend ─────────────────────────────────────────────────────────
echo [1/2] Starting Backend Server (port 5000)...
start "Loona Backend" cmd /k "cd /d %~dp0server && set NODE_ENV=development && npm run dev"

:: Give the server 3 seconds to boot before starting the client
timeout /t 3 /nobreak > nul

:: ── 2. Start Frontend (native / Expo Go) ─────────────────────────────────────
echo [2/2] Starting Expo (Expo Go / LAN mode)...
start "Loona Frontend" cmd /k "cd /d %~dp0client && npx expo start --clear"

echo.
echo ============================================
echo  Both servers are starting up!
echo.
echo  Backend : http://localhost:5000
echo  Health  : http://localhost:5000/health
echo  Expo Go : Scan QR code in the Expo window
echo.
echo  TIP: Run start-web.bat for browser testing
echo ============================================
echo.
pause

@echo off
title Loona Web Dev
color 0B

echo ============================================
echo    LOONA - Web Browser Mode
echo ============================================
echo.

:: Start backend in dev mode
start "Loona Backend" cmd /k "cd /d %~dp0server && set NODE_ENV=development && npm run dev"
timeout /t 3 /nobreak > nul

:: Start Expo in web mode
start "Loona Web" cmd /k "cd /d %~dp0client && npx expo start --web --clear"

echo.
echo  Frontend: http://localhost:8081
echo  Backend : http://localhost:5000
echo.
pause

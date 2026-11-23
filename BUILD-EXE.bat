@echo off
title Build MassTxt Executables
cd /d "%~dp0"

echo.
echo === Installing dependencies ===
call npm install
if errorlevel 1 goto :error

echo.
echo === Building Windows installer + portable exe ===
call npm run build
if errorlevel 1 goto :error

echo.
echo === Done. Output is in dist\ ===
explorer dist
pause
exit /b 0

:error
echo.
echo Build failed.
pause
exit /b 1

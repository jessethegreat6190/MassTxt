@echo off
title MassTxt - Build
color 0B
cls

:: Auto-elevate to Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo.
echo  ================================================
echo   MassTxt v2.0  ^|  Build Windows Installer
echo  ================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found. Install from nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK]  Node.js %NODE_VER%

:: Clean
echo  [1/4]  Cleaning...
if exist "dist" rmdir /s /q dist
set "EB=%LOCALAPPDATA%\electron-builder\Cache"
if exist "%EB%\winCodeSign" rmdir /s /q "%EB%\winCodeSign"
echo  [OK]  Cleaned

:: Install
echo  [2/4]  Installing packages...
call npm install
echo  [OK]  Packages installed

:: Patch the signing code to do nothing
echo  [3/4]  Patching code signing (disable it)...
set SIGN_FILE=node_modules\app-builder-lib\out\codeSign\windowsCodeSign.js

if exist "%SIGN_FILE%" (
    :: Use Node.js to patch the file - replace the sign function with a no-op
    node -e "const fs=require('fs');let c=fs.readFileSync('%SIGN_FILE%','utf8');if(!c.includes('PATCHED_NO_SIGN')){c=c.replace('async function sign(options)','async function sign(options){console.log(\"[SKIP] Code signing disabled\");return;}//PATCHED_NO_SIGN\nasync function sign_ORIG(options)');fs.writeFileSync('%SIGN_FILE%',c);console.log('Patched OK');} else {console.log('Already patched');}"
    echo  [OK]  Signing disabled
) else (
    echo  [WARN] Could not find signing file - continuing anyway
)

:: Set env vars too for extra safety
set CSC_IDENTITY_AUTO_DISCOVERY=false
set CSC_LINK=
set WIN_CSC_LINK=
fsutil behavior set SymlinkEvaluation L2L:1 R2R:1 L2R:1 R2L:1 >nul 2>&1

:: Build
echo  [4/4]  Building installer...
echo.
call npx electron-builder --win --publish never

if %errorlevel% neq 0 (
    echo.
    echo  Trying portable build...
    call npx electron-builder --win portable --publish never
)

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  BUILD FAILED - send screenshot for help
    pause & exit /b 1
)

:: Done
cls
color 0A
echo.
echo  ================================================
echo   BUILD COMPLETE!
echo  ================================================
echo.
dir /b "dist\*.exe" 2>nul
echo.
echo  Copy to USB - install on any Windows laptop!
echo.
explorer dist\
pause

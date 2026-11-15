@echo off
chcp 65001 > nul
title Kapse - G 🔰 Background Auto-Sync Manager
:MENU
cls
echo ================================================================
echo   ✂️  KAPSE - G 🔰 AUTOMATIC DATA SYNC MANAGEMENT CONSOLE  ✂️
echo ================================================================
echo.
echo   [1] Check Live Sync Status (लॅपटॉप vs मोबाईल डेटा तपासा)
echo   [2] Start Background Sync (बॅकग्राउंड सिंक सुरू करा - Silent)
echo   [3] Stop Background Sync (बॅकग्राउंड सिंक थांबवा)
echo   [4] Pull Mobile Data Right Now (आत्ताच डेटा खेचा - Instant Pull)
echo   [5] View Live Sync Logs (थेट सिंक लॉग्स पाहा)
echo   [6] Exit (बाहेर पडा)
echo.
echo ================================================================
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto STATUS
if "%choice%"=="2" goto START
if "%choice%"=="3" goto STOP
if "%choice%"=="4" goto PULL
if "%choice%"=="5" goto LOGS
if "%choice%"=="6" goto EXIT
goto MENU

:STATUS
cls
node services/statusDaemon.js
echo.
pause
goto MENU

:START
cls
echo Starting Background Auto-Sync Service...
wscript.exe start_sync_silent.vbs
timeout /t 2 > nul
node services/statusDaemon.js
echo.
pause
goto MENU

:STOP
cls
echo Stopping Background Auto-Sync Service...
node services/stopDaemon.js
echo.
pause
goto MENU

:PULL
cls
echo Pulling latest data from TiDB Cloud...
node sync_to_local.js
echo.
pause
goto MENU

:LOGS
cls
echo ================================================================
echo 📋 Viewing Live Sync Logs (Press Ctrl+C to return to menu)
echo ================================================================
powershell -Command "if (Test-Path logs/sync_daemon.log) { Get-Content logs/sync_daemon.log -Wait -Tail 25 } else { Write-Host 'No logs found yet.' }"
goto MENU

:EXIT
exit

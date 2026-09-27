@echo off
rem Starts the dock daemon in its own window, then the MIDI bridge here.
start "dockd" /d "%~dp0..\streamdock-m18" cmd /k npm run dockd
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
npm start

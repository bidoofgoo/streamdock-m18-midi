@echo off
rem Starts the dock daemon in its own window, then the MIDI bridge here.
rem When the bridge exits, the dockd window is closed too.
start "dockd" /d "%~dp0..\streamdock-m18" cmd /c npm run dockd
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
call npm start
taskkill /fi "WINDOWTITLE eq dockd*" /t /f >nul 2>&1

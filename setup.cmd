@echo off
setlocal
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS from https://nodejs.org/en/download and reopen this window.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup.ps1"
set "rtlResult=%errorlevel%"
pause
exit /b %rtlResult%

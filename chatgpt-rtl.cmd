@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0chatgpt-rtl.ps1" %*
exit /b %errorlevel%

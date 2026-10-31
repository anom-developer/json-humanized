@echo off
title json-humanized UI
echo ========================================================
echo   json-humanized - Starting Web UI...
echo   Open in your browser to transform JSON into human prose!
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Starting local server with Node.js...
    node "%~dp0bin\cli.js" --ui
) else (
    echo Node.js not detected in PATH, opening standalone HTML app...
    start "" "%~dp0docs\index.html"
)
pause

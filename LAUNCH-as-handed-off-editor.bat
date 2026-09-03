@echo off
setlocal
set DIR=%~dp0as-handed-off-zip\usavsmaga-main
cd /d "%DIR%"

if not exist node_modules (
    echo Installing dependencies - first run only, takes about 30 seconds...
    call npm install
)

echo.
echo Starting the as-handed-off Dramaton editor - the 2026-01-22 zip snapshot.
echo Once it says "ready", open this in a browser:
echo.
echo     http://localhost:8094
echo.
echo NOTE: this build stops at a Supabase sign-in screen - that is expected,
echo not a break. See PRESERVED_README.md for why.
echo.

call npm run dev -- --port 8094 --strictPort

pause

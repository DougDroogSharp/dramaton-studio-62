@echo off
setlocal
set DIR=%~dp0preview-patched
cd /d "%DIR%"

if not exist node_modules (
    echo Installing dependencies - first run only, takes about 30 seconds...
    call npm install
)

echo.
echo Starting Dramaton Editor 2.0 - the 2025-12-18 ancestor snapshot.
echo Once it says "ready", open this in a browser:
echo.
echo     http://localhost:8096
echo.
echo NOTE: this is the ONE-LINE-PATCHED preview copy (see PRESERVED_README.md
echo for the exact patch). The untouched original is in dramaton-old_2025-12-18_ancestor.zip
echo and .\extracted - that copy has a real JSX syntax bug in SceneEditor.tsx
echo and will NOT build. This preview-patched copy is for looking at the app only.
echo.

call npx vite --port 8096 --strictPort

pause

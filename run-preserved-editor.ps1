# Launches the preserved Dramaton Editor snapshot on a dedicated port.
# See PRESERVED_README.md. Safe to run anytime; does not touch main or other worktrees.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run)..."
    npm install
}

Write-Host "Starting preserved Dramaton Editor on http://localhost:8092 ..."
npm run dev -- --port 8092

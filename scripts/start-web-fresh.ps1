# Start frontend web with clean caches so changes show after refresh.
# Run from repo root: cd front && .\scripts\start-web-fresh.ps1

$ErrorActionPreference = "Stop"
$frontRoot = Split-Path -Parent $PSScriptRoot
Set-Location $frontRoot

Write-Host "Clearing caches..." -ForegroundColor Cyan
@(
  "node_modules\.cache",
  ".expo"
) | ForEach-Object {
  $path = Join-Path $frontRoot $_
  if (Test-Path $path) {
    Remove-Item -Recurse -Force $path
    Write-Host "  Removed $_"
  }
}

# Kill any process using port 8084, 8085, 8086 so we can bind
foreach ($port in 8084, 8085, 8086) {
  $line = netstat -ano 2>$null | findstr "LISTENING" | findstr ":$port "
  if ($line) {
    $parts = $line -split '\s+'
    $procId = $parts[-1]
    if ($procId -match '^\d+$') {
      Write-Host "Stopping process on port $port (PID $procId)..." -ForegroundColor Yellow
      taskkill /PID $procId /F 2>$null
      Start-Sleep -Seconds 1
    }
  }
}

$env:CI = "false"
# Note: Expo uses 8084 for web regardless of --port (--port only affects Metro for native)
Write-Host "Starting Expo web with --clear..." -ForegroundColor Green
Write-Host "Open: http://localhost:8084" -ForegroundColor Green
Write-Host "To see latest code: close all tabs for 8084, then open the URL again, or use Incognito." -ForegroundColor Yellow
Write-Host "Bottom-left 'load XXXXX' changes each load = new bundle." -ForegroundColor Green
& npx expo start --web --port 8084 --clear

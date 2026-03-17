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

# Kill any process using port 8084 or 8085 so we can bind
foreach ($port in 8084, 8085) {
  $line = netstat -ano 2>$null | findstr "LISTENING" | findstr ":$port "
  if ($line) {
    $parts = $line -split '\s+'
    $pid = $parts[-1]
    if ($pid -match '^\d+$') {
      Write-Host "Stopping process on port $port (PID $pid)..." -ForegroundColor Yellow
      taskkill /PID $pid /F 2>$null
      Start-Sleep -Seconds 1
    }
  }
}

$env:CI = "false"
Write-Host "Starting Expo web with --clear on port 8085..." -ForegroundColor Green
Write-Host "When ready, open: http://localhost:8085" -ForegroundColor Green
Write-Host "Do a HARD refresh: Ctrl+Shift+R (or use Incognito)" -ForegroundColor Green
& npx expo start --web --port 8085 --clear

# Simulates B2B registration from the Android emulator's API perspective.
# 1) Checks adb emulator is connected
# 2) Optional: probe HTTPS from inside the emulator (if curl exists)
# 3) Runs Node script with same EXPO_PUBLIC_API_URL as the app
#
# Usage:
#   npm run test:emu-registration
#   powershell -File scripts/simulate-emulator-registration.ps1

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontRoot = Split-Path -Parent $scriptDir
Set-Location $frontRoot

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) {
  $env:ANDROID_HOME = $sdk
  $env:PATH = "$(Join-Path $sdk 'platform-tools');$env:PATH"
}

Write-Host ''
Write-Host '=== PI emulator registration simulation ===' -ForegroundColor Cyan
Write-Host "Project: $frontRoot"
Write-Host ''

# Load .env for display
$envFile = Join-Path $frontRoot '.env'
$apiUrl = ''
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*EXPO_PUBLIC_API_URL\s*=\s*(.+)\s*$') {
      $apiUrl = $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
}
if ($apiUrl) {
  Write-Host "App API (from .env): $apiUrl" -ForegroundColor DarkGray
} else {
  Write-Host 'Warning: EXPO_PUBLIC_API_URL not found in .env' -ForegroundColor Yellow
}

$devices = @((& adb devices 2>$null) | Where-Object { $_ -match '\tdevice$' })
if ($devices.Count -lt 1) {
  Write-Host 'No Android emulator/device (adb). Start an AVD, then re-run.' -ForegroundColor Yellow
  Write-Host 'Continuing host-only API test anyway...' -ForegroundColor DarkGray
} else {
  Write-Host "ADB device: $($devices[0].Split("`t")[0])" -ForegroundColor Green

  # Emulator → host network smoke (ICMP often blocked; try HTTPS via toybox curl)
  $emuCurl = 'curl -s -o /dev/null -w %{http_code} --connect-timeout 8 https://pi-back.vercel.app/api/listings?limit=1'
  try {
    $code = (& adb shell $emuCurl 2>&1 | Out-String).Trim()
    if ($code -match '^\d{3}$' -and [int]$code -ge 200 -and [int]$code -lt 500) {
      Write-Host "Emulator HTTPS to Vercel: HTTP $code" -ForegroundColor Green
    } else {
      Write-Host "Emulator HTTPS probe: $code (curl may be missing or network limited)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host 'Emulator HTTPS probe skipped (no curl or offline emulator)' -ForegroundColor DarkGray
  }
}

Write-Host ''
Write-Host 'Running Node API flow (submit -> password -> skip-verify -> login)...' -ForegroundColor Cyan
Write-Host ''

node (Join-Path $scriptDir 'simulate-emulator-broker-registration.mjs')
$exit = $LASTEXITCODE
if ($exit -ne 0) { exit $exit }

Write-Host 'Done. If PASS, reload the app (npx expo start -c) and register with a new email.' -ForegroundColor Green

# Point the Android emulator at pi-back on the host (10.0.2.2) and verify connectivity.
# The emulator on this machine has no public DNS/internet; Vercel will not work until that is fixed.
$ErrorActionPreference = 'Stop'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) {
  $env:ANDROID_HOME = $sdk
  $env:PATH = "$(Join-Path $sdk 'platform-tools');$env:PATH"
}

$devices = @((& adb devices 2>$null) | Where-Object { $_ -match '\tdevice$' })
if ($devices.Count -lt 1) {
  Write-Host 'No emulator/device. Start an AVD first.' -ForegroundColor Yellow
  exit 1
}

& adb reverse tcp:3001 tcp:3001 2>$null | Out-Null
Write-Host 'adb reverse tcp:3001 tcp:3001' -ForegroundColor DarkGray
Write-Host 'Set in pi-front/.env: EXPO_PUBLIC_API_URL_ANDROID=http://127.0.0.1:3001' -ForegroundColor DarkGray

$hostReachable = $false
try {
  $p = adb shell ping -c 1 -W 2 10.0.2.2 2>&1 | Out-String
  if ($p -match '1 received') { $hostReachable = $true }
} catch {}

if (-not $hostReachable) {
  Write-Host 'Emulator cannot reach host at 10.0.2.2 — cold-boot the AVD and retry.' -ForegroundColor Red
  exit 1
}

try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/listings?status=published&limit=1' -UseBasicParsing -TimeoutSec 4
  Write-Host "pi-back OK on :3001 (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host 'pi-back is not running on port 3001.' -ForegroundColor Yellow
  Write-Host '  cd ..\pi-back' -ForegroundColor Yellow
  Write-Host '  npm run dev' -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'pi-front/.env should have EXPO_PUBLIC_API_URL_ANDROID=http://127.0.0.1:3001' -ForegroundColor Cyan
  Write-Host 'Then restart Expo: npx expo start -c' -ForegroundColor Cyan
  exit 1
}

Write-Host 'Emulator API: http://127.0.0.1:3001 (adb reverse; set in EXPO_PUBLIC_API_URL_ANDROID)' -ForegroundColor Green

# Live dev on a physical Android phone (USB) — Metro hot reload like the emulator.
# Prereqs: USB debugging enabled, phone connected, same Wi‑Fi optional if using adb reverse.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $sdk)) {
  Write-Error "Android SDK not found at $sdk — install Android Studio first."
}
$env:ANDROID_HOME = $sdk
$env:PATH = "$(Join-Path $sdk 'platform-tools');$env:PATH"

$lines = @((& adb devices 2>$null) | Where-Object { $_ -match '\tdevice$' })
$physical = @($lines | Where-Object { $_ -notmatch '^emulator-' })
if ($physical.Count -lt 1) {
  Write-Host ''
  Write-Host 'No physical Android device detected.' -ForegroundColor Yellow
  Write-Host '1. On phone: Settings → About → tap Build number 7× → Developer options' -ForegroundColor Cyan
  Write-Host '2. Enable USB debugging, plug in USB, accept the RSA prompt on the phone' -ForegroundColor Cyan
  Write-Host '3. Run: adb devices   (should show your phone as "device", not "unauthorized")' -ForegroundColor Cyan
  Write-Host ''
  exit 1
}

$serial = ($physical[0] -split "`t")[0]
Write-Host "Physical device: $serial" -ForegroundColor Green

# Metro (8081) — phone loads JS bundle from your PC over USB
& adb -s $serial reverse tcp:8081 tcp:8081 2>$null | Out-Null
Write-Host 'adb reverse tcp:8081 tcp:8081  (Metro)' -ForegroundColor DarkGray

# Optional local pi-back — only if EXPO_PUBLIC_API_URL points to localhost/127.0.0.1
& adb -s $serial reverse tcp:3001 tcp:3001 2>$null | Out-Null
Write-Host 'adb reverse tcp:3001 tcp:3001  (local pi-back, if used)' -ForegroundColor DarkGray

Set-Location $root
Write-Host ''
Write-Host 'Starting Metro. Your .env API (e.g. pi-back.vercel.app) works on a real phone as-is.' -ForegroundColor Green
Write-Host ''
Write-Host 'First time on this phone? In another terminal run:' -ForegroundColor Yellow
Write-Host '  npm run android:emu' -ForegroundColor Yellow
Write-Host 'That installs the debug app once. After that, Metro alone is enough (press a in Metro or reopen the app).' -ForegroundColor Yellow
Write-Host ''
npx expo start -c

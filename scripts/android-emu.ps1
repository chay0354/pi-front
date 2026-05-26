# Build / run the native app on a connected emulator or device.
# Prereqs: Android SDK (Studio), emulator running OR USB device with USB debugging.
$ErrorActionPreference = 'Stop'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $sdk)) {
  Write-Error "Android SDK not found at $sdk — install Android Studio and SDK first."
}
$env:ANDROID_HOME = $sdk
$env:PATH = "$(Join-Path $sdk 'platform-tools');$(Join-Path $sdk 'emulator');$env:PATH"

$deviceLines = @((& adb devices 2>$null) | Where-Object { $_ -match '\tdevice$' })
if ($deviceLines.Count -ge 1) {
  & "$PSScriptRoot\android-emulator-api.ps1" 2>$null
}
if ($deviceLines.Count -lt 1) {
  Write-Host ''
  Write-Host 'No Android device/emulator detected. Start an AVD (Device Manager) or plug in a phone, then run:'
  Write-Host '  npm run android:emu' -ForegroundColor Yellow
  Write-Host ''
  exit 1
}

Set-Location (Join-Path $PSScriptRoot '..')
Write-Host "ANDROID_HOME=$sdk"
Write-Host 'Running expo run:android (Metro must use default port 8081 — see metro.config.js)...'
npx expo run:android

# Start pi-back + adb reverse + Expo (clear cache). Run from pi-front.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$back = Join-Path (Split-Path $root -Parent) 'pi-back'

$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path $sdk) {
  $env:ANDROID_HOME = $sdk
  $env:PATH = "$(Join-Path $sdk 'platform-tools');$env:PATH"
}

$listening = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Write-Host 'Starting pi-back on port 3001...' -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    '-NoProfile', '-NoExit', '-Command',
    "Set-Location '$back'; npm run dev"
  )
  $deadline = (Get-Date).AddSeconds(25)
  do {
    Start-Sleep -Seconds 1
    $listening = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  } until ($listening -or (Get-Date) -gt $deadline)
  if (-not $listening) {
    Write-Error 'pi-back did not start on :3001. Open pi-back and run: npm run dev'
  }
}

& "$PSScriptRoot\android-emulator-api.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location $root
Write-Host ''
Write-Host 'Starting Expo (cache cleared). Emulator API: http://127.0.0.1:3001' -ForegroundColor Green
Write-Host 'In Metro log look for: [api] API base = http://127.0.0.1:3001' -ForegroundColor Green
Write-Host ''
npx expo start -c

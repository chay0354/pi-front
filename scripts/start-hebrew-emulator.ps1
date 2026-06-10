# Stop any running emulator and cold-boot the AVD with Hebrew (he-IL) system UI.
$ErrorActionPreference = 'Stop'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $sdk)) {
  Write-Error "Android SDK not found at $sdk"
}
$env:ANDROID_HOME = $sdk
$env:PATH = "$(Join-Path $sdk 'platform-tools');$(Join-Path $sdk 'emulator');$env:PATH"

$avd = 'Medium_Phone_API_36.1'
$configIni = Join-Path $env:USERPROFILE ".android\avd\Medium_Phone.avd\config.ini"

Write-Host 'Stopping running emulators...' -ForegroundColor Cyan
& adb devices 2>$null | ForEach-Object {
  if ($_ -match '^(emulator-\d+)\s+device') {
    & adb -s $Matches[1] emu kill 2>$null
  }
}
Start-Sleep -Seconds 4
Get-Process -Name qemu-system*, emulator -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

if (Test-Path $configIni) {
  $ini = Get-Content $configIni -Raw
  foreach ($pair in @(
    @{k = 'hw.language'; v = 'he'},
    @{k = 'hw.country'; v = 'IL'},
    @{k = 'fastboot.forceColdBoot'; v = 'yes'},
    @{k = 'fastboot.forceFastBoot'; v = 'no'}
  )) {
    if ($ini -match "(?m)^$([regex]::Escape($pair.k))=") {
      $ini = $ini -replace "(?m)^$([regex]::Escape($pair.k))=.*$", "$($pair.k)=$($pair.v)"
    } else {
      $ini += "`n$($pair.k)=$($pair.v)"
    }
  }
  Set-Content -Path $configIni -Value $ini.TrimEnd() -Encoding UTF8
  Write-Host "AVD config updated: hw.language=he, hw.country=IL" -ForegroundColor DarkGray
}

Write-Host "Starting $avd (Hebrew cold boot)..." -ForegroundColor Cyan
Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList @(
  '-avd', $avd,
  '-no-snapshot-load',
  '-prop', 'persist.sys.locale=he-IL',
  '-timezone', 'Asia/Jerusalem'
) -WindowStyle Normal

$serial = $null
for ($i = 0; $i -lt 90; $i++) {
  Start-Sleep -Seconds 3
  $line = @((& adb devices 2>$null) | Where-Object { $_ -match '^emulator-\d+\s+device' } | Select-Object -First 1)
  if (-not $line) { continue }
  $serial = ($line -split '\s+')[0]
  $boot = (& adb -s $serial shell getprop sys.boot_completed 2>&1) -join ''
  if ($boot -match '1') { break }
}

if (-not $serial) {
  Write-Error 'Emulator did not become ready in time.'
}

Write-Host "Device: $serial" -ForegroundColor Green

# API 33+: switch system UI language (Settings, launcher, etc.)
& adb -s $serial shell cmd locale set-device-locale he-IL 2>$null
Start-Sleep -Seconds 5

$deviceLocale = & adb -s $serial shell cmd locale get-device-locale 2>&1
$locales = & adb -s $serial shell settings get system system_locales 2>&1
Write-Host "device locale: $deviceLocale"
Write-Host "system_locales: $locales"

& adb -s $serial reverse tcp:3001 tcp:3001 2>$null | Out-Null
& adb -s $serial reverse tcp:8081 tcp:8081 2>$null | Out-Null
Write-Host 'adb reverse: 3001, 8081' -ForegroundColor DarkGray
Write-Host 'Hebrew emulator ready.' -ForegroundColor Green

# Cold-boot the Android emulator with working DNS servers.
# Use this when the emulator gives "Network request failed" for every API call
# (DNS dies inside the AVD; only a cold boot + -dns-server fixes it reliably).
#
# Usage:
#   npm run android:fix-network
#   powershell -File scripts/fix-emulator-network.ps1 -Avd MyAVD
param(
  [string]$Avd = '',
  [string]$DnsServers = '1.1.1.1,9.9.9.9'
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$adb = Join-Path $sdk 'platform-tools\adb.exe'
$emu = Join-Path $sdk 'emulator\emulator.exe'

if (-not (Test-Path $adb) -or -not (Test-Path $emu)) {
  Write-Host 'Android SDK not found at' $sdk -ForegroundColor Red
  exit 1
}

if (-not $Avd) {
  $avds = @(& $emu -list-avds 2>$null | Where-Object { $_ -and $_.Trim() })
  if ($avds.Count -lt 1) {
    Write-Host 'No AVDs found. Create one in Android Studio first.' -ForegroundColor Red
    exit 1
  }
  $Avd = $avds[0].Trim()
}

Write-Host "AVD: $Avd"
Write-Host "DNS: $DnsServers"

function Test-EmulatorDns {
  param([string]$AdbPath, [string]$Target)
  # ICMP is often blocked by the emulator NAT, so we accept either bytes returned
  # OR the line "PING host (a.b.c.d)" — the IP in parentheses proves DNS resolved.
  $out = (& $AdbPath shell "ping -c 1 -W 2 $Target" 2>&1 | Out-String)
  if ($out -match 'unknown host') { return $false }
  return ($out -match 'bytes from' -or $out -match 'PING\s+\S+\s+\(\d+\.\d+\.\d+\.\d+\)')
}

function Wait-ForBoot {
  param([string]$AdbPath, [int]$TimeoutSeconds = 180)
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    Start-Sleep -Seconds 3
    $devices = @((& $AdbPath devices 2>$null) | Where-Object { $_ -match 'emulator-\d+\s+device' })
    if ($devices.Count -gt 0) {
      $raw = (& $AdbPath shell 'getprop sys.boot_completed' 2>$null | Out-String).Trim()
      if ($raw -eq '1') { return $true }
    }
  } until ((Get-Date) -gt $deadline)
  return $false
}

$running = @((& $adb devices 2>$null) | Where-Object { $_ -match 'emulator-\d+\s+device' })
if ($running.Count -gt 0) {
  Write-Host 'Probing current emulator DNS...' -ForegroundColor Cyan
  if (Test-EmulatorDns -AdbPath $adb -Target 'pi-back.vercel.app') {
    Write-Host 'Emulator can already resolve pi-back.vercel.app. No action needed.' -ForegroundColor Green
    exit 0
  }
  Write-Host 'DNS is broken inside the emulator.' -ForegroundColor Yellow
} else {
  Write-Host 'No emulator running — will cold-boot fresh.' -ForegroundColor DarkGray
}

$running2 = @((& $adb devices 2>$null) | Where-Object { $_ -match 'emulator-\d+\s+device' })
if ($running2.Count -gt 0) {
  $serial = ($running2[0] -split '\s+')[0]
  Write-Host "Killing running emulator: $serial" -ForegroundColor Cyan
  & $adb -s $serial emu kill 2>&1 | Out-Null
  $deadline = (Get-Date).AddSeconds(25)
  do {
    Start-Sleep -Milliseconds 800
    $still = @((& $adb devices 2>$null) | Where-Object { $_ -match 'emulator-\d+\s+device' })
  } until ($still.Count -lt 1 -or (Get-Date) -gt $deadline)
}

Write-Host ''
Write-Host "Cold-booting AVD with -dns-server $DnsServers..." -ForegroundColor Cyan
$logFile = Join-Path $env:TEMP "emulator-coldboot-$Avd.log"
$args = @(
  '-avd', $Avd,
  '-dns-server', $DnsServers,
  '-no-snapshot-load',
  '-no-boot-anim'
)
Start-Process -FilePath $emu -ArgumentList $args -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" -WindowStyle Minimized

Write-Host 'Waiting for boot...' -ForegroundColor DarkGray
$booted = Wait-ForBoot -AdbPath $adb -TimeoutSeconds 180

if (-not $booted) {
  Write-Host 'Emulator did not finish booting in 3 minutes.' -ForegroundColor Red
  Write-Host "Boot log: $logFile" -ForegroundColor DarkGray
  exit 1
}

Write-Host 'Booted. Re-testing DNS...' -ForegroundColor Cyan
Start-Sleep -Seconds 4
if (Test-EmulatorDns -AdbPath $adb -Target 'pi-back.vercel.app') {
  Write-Host 'OK: emulator can reach pi-back.vercel.app' -ForegroundColor Green
  exit 0
}
Write-Host 'DNS still broken. Try a different DNS:' -ForegroundColor Yellow
Write-Host '  powershell -File scripts/fix-emulator-network.ps1 -DnsServers 1.1.1.1,9.9.9.9' -ForegroundColor Yellow
exit 1

# Start Expo for the iOS development client (NOT Expo Go).
# Prerequisite: install the iOS dev build from EAS on your iPhone first.
#   cd pi-front
#   npx eas-cli build --platform ios --profile development
#
# Uses tunnel so iPhone can reach Metro even when LAN/firewall blocks LAN.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ''
Write-Host 'Starting Expo for iOS DEV CLIENT (tunnel mode)...' -ForegroundColor Cyan
Write-Host 'Open the pi 2701 dev app on your iPhone — NOT Expo Go.' -ForegroundColor Yellow
Write-Host ''
npx expo start --dev-client --tunnel --port 8081

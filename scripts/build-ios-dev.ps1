# One-time: EAS cloud iOS development build (requires Apple Developer login).
# Run this in an interactive terminal — EAS will prompt for Apple ID password / 2FA.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:EXPO_APPLE_ID = 'jacob@pi2701.com'

Write-Host ''
Write-Host 'Starting iOS development build for pi 2701...' -ForegroundColor Cyan
Write-Host "Apple ID: $($env:EXPO_APPLE_ID)"
Write-Host ''
Write-Host 'When prompted:'
Write-Host '  1. Log in to Apple (use app-specific password if asked)'
Write-Host '  2. Let EAS manage credentials (recommended)'
Write-Host '  3. Register your iPhone if asked (UDID link on device)'
Write-Host ''

npx eas-cli build --platform ios --profile development --wait

Write-Host ''
Write-Host 'When the build finishes, open the install link on your iPhone and install the dev app.' -ForegroundColor Green
Write-Host 'Then run: npm run ios:dev' -ForegroundColor Green

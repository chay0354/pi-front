# Saves the latest successful Android app artifact into your Downloads folder.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $env:USERPROFILE "Downloads")
Write-Host "Working directory: $(Get-Location)"
npx eas-cli@latest build:download --platform android --non-interactive @args

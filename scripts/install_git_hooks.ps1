$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

git config core.hooksPath .githooks

Write-Host '[hooks] core.hooksPath set to .githooks'
Write-Host '[hooks] pre-push hook is now active'

param(
    [string]$PythonExe = "",
    [switch]$NoZip
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $PythonExe) {
    if (Test-Path ".venv312\Scripts\python.exe") {
        $PythonExe = ".venv312\Scripts\python.exe"
    }
    elseif (Test-Path ".venv\Scripts\python.exe") {
        $PythonExe = ".venv\Scripts\python.exe"
    }
    else {
        $PythonExe = "python"
    }
}

$distPath = Join-Path $root "dist\portable"
$workPath = Join-Path $root "build\pyinstaller"
$specPath = Join-Path $root "packaging\voodoo_loader.spec"

New-Item -ItemType Directory -Path $distPath -Force | Out-Null
New-Item -ItemType Directory -Path $workPath -Force | Out-Null

& $PythonExe -m PyInstaller --noconfirm --clean --distpath $distPath --workpath $workPath $specPath

$bundlePath = Join-Path $distPath "VoodooLoader"
if (-not (Test-Path (Join-Path $bundlePath "VoodooLoader.exe"))) {
    throw "Portable bundle was not created: $bundlePath"
}

if (-not $NoZip) {
    $zipPath = Join-Path $distPath "VoodooLoader-portable.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    Compress-Archive -Path (Join-Path $bundlePath "*") -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "Portable ZIP: $zipPath"
}

Write-Host "Portable folder: $bundlePath"

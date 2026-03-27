param(
    [string]$PythonExe = "",
    [switch]$NoArchive,
    [string]$TargetOs = "windows",
    [string]$TargetArch = "x64",
    [string]$PlatformLabel = "windows"
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

$env:PYTHONPATH = Join-Path $root "src"

$version = ""
if ($env:VOODOO_LOADER_BUILD_VERSION) {
    $version = $env:VOODOO_LOADER_BUILD_VERSION.Trim().TrimStart("v", "V")
}

if (-not $version) {
    try {
        $latestTag = (& git describe --tags --match "v*" --abbrev=0 2>$null).Trim()
        if ($latestTag) {
            $version = $latestTag.TrimStart("v", "V")
        }
    }
    catch {
        $version = ""
    }
}

if (-not $version) {
    $version = (& $PythonExe -c "from voodoo_loader import __version__; print(__version__)").Trim().TrimStart("v", "V")
}

if (-not $version) {
    throw "Failed to resolve app version"
}

$distPath = Join-Path $root "dist\portable"
$workPath = Join-Path $root "build\pyinstaller"
$specPath = Join-Path $root "packaging\voodoo_loader.spec"

New-Item -ItemType Directory -Path $distPath -Force | Out-Null
New-Item -ItemType Directory -Path $workPath -Force | Out-Null

& $PythonExe -m PyInstaller --noconfirm --clean --distpath $distPath --workpath $workPath $specPath
if ($LASTEXITCODE -ne 0) {
    throw "PyInstaller build failed with exit code $LASTEXITCODE"
}

$standaloneExe = Join-Path $distPath "VoodooLoader.exe"
if (Test-Path $standaloneExe) {
    Remove-Item $standaloneExe -Force -ErrorAction SilentlyContinue
}

$bundlePath = Join-Path $distPath "VoodooLoader"
$exeName = "VoodooLoader.exe"
if ($TargetOs -ne "windows") {
    $exeName = "VoodooLoader"
}
if (-not (Test-Path (Join-Path $bundlePath $exeName))) {
    throw "Portable bundle was not created: $bundlePath"
}

$versionFilePath = Join-Path $bundlePath "voodoo_loader_version.txt"
[System.IO.File]::WriteAllText($versionFilePath, $version, (New-Object System.Text.UTF8Encoding($false)))

if (-not $NoArchive) {
    $archiveBase = "VoodooLoader-v$version-$PlatformLabel-$TargetArch-portable"
    $archivePath = Join-Path $distPath ($archiveBase + ".zip")
    if (Test-Path $archivePath) {
        Remove-Item $archivePath -Force
    }
    Compress-Archive -Path (Join-Path $bundlePath "*") -DestinationPath $archivePath -CompressionLevel Optimal
    Write-Host "Portable archive: $archivePath"
}

Write-Host "Portable folder: $bundlePath"
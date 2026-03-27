param(
    [string]$PythonExe = ""
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

function Test-PythonExe([string]$Candidate) {
    if ([string]::IsNullOrWhiteSpace($Candidate)) { return $false }
    try {
        & $Candidate -V *> $null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

if ([string]::IsNullOrWhiteSpace($PythonExe)) {
    $candidates = @(
        '.\\.venv312\\Scripts\\python.exe',
        '.\\.venv\\Scripts\\python.exe',
        'python'
    )

    foreach ($candidate in $candidates) {
        if (Test-PythonExe $candidate) {
            $PythonExe = $candidate
            break
        }
    }
}

if (-not (Test-PythonExe $PythonExe)) {
    Write-Error "[qa] Unable to find a working Python interpreter."
    exit 1
}

$env:PYTHONPATH = Join-Path $root 'src'
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = '1'

Write-Host "[qa] Python: $PythonExe"
Write-Host '[qa] Running ruff...'
& $PythonExe -m ruff check src tests
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[qa] Running mypy...'
& $PythonExe -m mypy src/voodoo_loader
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[qa] Running pytest...'
& $PythonExe -m pytest tests -q -p no:cacheprovider -p no:tmpdir
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[qa] All checks passed.'

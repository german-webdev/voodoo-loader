param(
    [string]$PythonExe = ""
)

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

if ([string]::IsNullOrWhiteSpace($PythonExe)) {
    if (Test-Path '.\\.venv312\\Scripts\\python.exe') {
        $PythonExe = '.\\.venv312\\Scripts\\python.exe'
    } elseif (Test-Path '.\\.venv\\Scripts\\python.exe') {
        $PythonExe = '.\\.venv\\Scripts\\python.exe'
    } else {
        $PythonExe = 'python'
    }
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

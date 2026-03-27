# Voodoo Loader

Voodoo Loader is a modular desktop downloader for Windows built on top of `aria2c`.

## Status

This is the new product implementation built from PRD architecture.
Legacy MVP scripts in repository root are not used as product architecture.

## Local environment (uv + venv)

From the repository root:

```powershell
$env:UV_CACHE_DIR="$PWD\.uv-cache"
$env:UV_PYTHON_INSTALL_DIR="$PWD\.uv-python"
$env:UV_CONFIG_DIR="$PWD\.uv-config"
uv venv .venv312 --managed-python -p 3.12 --seed
uv pip install --python .\.venv312\Scripts\python.exe PySide6 pytest pytest-qt ruff mypy
```

## Run app

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m voodoo_loader.main
```

Or use launcher:

```powershell
launch_voodoo_loader.bat
```

## Quality checks (manual)

PowerShell:

```powershell
scripts\qa_gate.ps1
```

Bash:

```bash
./scripts/qa_gate.sh
```

## Git pre-push quality gate

Enable hooks path once per clone:

PowerShell:

```powershell
scripts\install_git_hooks.ps1
```

Bash:

```bash
./scripts/install_git_hooks.sh
```

After this, every `git push` runs QA gate automatically:
- `ruff check src tests`
- `mypy src/voodoo_loader`
- `pytest tests -q -p no:cacheprovider -p no:tmpdir`

Push is blocked if any check fails.

## CI required checks (GitHub)

Workflow: `.github/workflows/qa-gate.yml`

Recommended branch protection for `master`:
- Require a pull request before merging
- Require status checks to pass before merging
- Required check: `QA Gate / qa`
- Restrict direct pushes to `master`

## Build Portable Version

Install build dependency once:

```powershell
$env:UV_CACHE_DIR="$PWD\.uv-cache"
$env:UV_PYTHON_INSTALL_DIR="$PWD\.uv-python"
$env:UV_CONFIG_DIR="$PWD\.uv-config"
uv pip install --python .\.venv312\Scripts\python.exe pyinstaller
```

Build portable folder + zip:

```powershell
scripts\build_portable.ps1
```

Or:

```bat
scripts\build_portable.bat
```

Output artifacts:
- `dist\portable\VoodooLoader\VoodooLoader.exe` (Windows local build)
- `dist\portable\VoodooLoader-v<version>-windows-x64-portable.zip` (Windows)
- `dist/portable/VoodooLoader-v<version>-linux-ubuntu-22.04-x64-portable.tar.gz` (Linux CI)

GitHub Actions workflow:
- `.github/workflows/build-portable-matrix.yml` builds portable archives for:
  - Windows x64
  - Linux Ubuntu x64

Note on Windows x86:
- Current stack uses PySide6/Qt6; official Qt6 Windows support targets x64/ARM64 and does not provide x86 binaries, so win-x86 build is deferred unless UI stack is migrated.

Security note:
- Token/username are stored in local settings only when `Remember token` / `Remember username` is enabled.
- Stored settings are plaintext JSON in portable mode (`voodoo_loader_settings.json` near `VoodooLoader.exe`).

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

## Quality checks

```powershell
$env:PYTHONPATH="$PWD\src"
.\.venv312\Scripts\python.exe -m ruff check src tests
.\.venv312\Scripts\python.exe -m mypy src/voodoo_loader
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD='1'
.\.venv312\Scripts\python.exe -m pytest tests -q -p no:cacheprovider -p no:tmpdir
```

## Implemented now

- Dynamic queue: can add links while queue is running
- Optional auth: token, username/password, custom headers
- Configurable max simultaneous downloads via Settings
- `aria2c` detection + bootstrap path
- Queue persistence across sessions for unfinished items
- RU/EN localization service with in-app language switch

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
- `dist\portable\VoodooLoader\VoodooLoader.exe`
- `dist\portable\VoodooLoader-portable.zip`

Security note:
- Token/username are stored in local settings only when `Remember token` / `Remember username` is enabled.
- Stored settings are plaintext JSON in portable mode (`voodoo_loader_settings.json` near `VoodooLoader.exe`).

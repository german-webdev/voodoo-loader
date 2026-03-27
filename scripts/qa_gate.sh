#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_EXE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --python)
      PYTHON_EXE="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$PYTHON_EXE" ]]; then
  if [[ -x ".venv312/Scripts/python.exe" ]]; then
    PYTHON_EXE=".venv312/Scripts/python.exe"
  elif [[ -x ".venv/Scripts/python.exe" ]]; then
    PYTHON_EXE=".venv/Scripts/python.exe"
  elif [[ -x ".venv312/bin/python" ]]; then
    PYTHON_EXE=".venv312/bin/python"
  elif [[ -x ".venv/bin/python" ]]; then
    PYTHON_EXE=".venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_EXE="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_EXE="python"
  else
    echo "Python interpreter not found" >&2
    exit 1
  fi
fi

export PYTHONPATH="$ROOT_DIR/src"
export PYTEST_DISABLE_PLUGIN_AUTOLOAD=1

echo "[qa] Python: $PYTHON_EXE"
echo "[qa] Running ruff..."
"$PYTHON_EXE" -m ruff check src tests

echo "[qa] Running mypy..."
"$PYTHON_EXE" -m mypy src/voodoo_loader

echo "[qa] Running pytest..."
"$PYTHON_EXE" -m pytest tests -q -p no:cacheprovider -p no:tmpdir

echo "[qa] All checks passed."

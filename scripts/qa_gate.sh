#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: $0 [--python <python_executable>]" >&2
}

PYTHON_EXE=""

is_working_python() {
  local candidate="${1:-}"
  if [[ -z "$candidate" ]]; then
    return 1
  fi
  "$candidate" -V >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --python)
      if [[ $# -lt 2 || "${2:-}" == --* ]]; then
        echo "Missing value for --python" >&2
        usage
        exit 1
      fi
      PYTHON_EXE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PYTHON_EXE" ]]; then
  candidates=(
    ".venv312/Scripts/python.exe"
    ".venv/Scripts/python.exe"
    ".venv312/bin/python"
    ".venv/bin/python"
    "python3"
    "python"
  )

  for candidate in "${candidates[@]}"; do
    if is_working_python "$candidate"; then
      PYTHON_EXE="$candidate"
      break
    fi
  done
fi

if ! is_working_python "$PYTHON_EXE"; then
  echo "Python interpreter not found or not runnable: $PYTHON_EXE" >&2
  exit 1
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

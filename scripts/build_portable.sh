#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_EXE=""
TARGET_ARCH="x64"
PLATFORM_LABEL="linux-ubuntu"
NO_ARCHIVE="false"

usage() {
  echo "Usage: ./scripts/build_portable.sh [--python <exe>] [--target-arch <arch>] [--platform-label <label>] [--no-archive]" >&2
}

require_arg_value() {
  local flag="$1"
  local value="${2-}"
  if [[ -z "$value" || "$value" == --* ]]; then
    echo "Missing value for ${flag}" >&2
    usage
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --python)
      require_arg_value "$1" "${2-}"
      PYTHON_EXE="$2"
      shift 2
      ;;
    --target-arch)
      require_arg_value "$1" "${2-}"
      TARGET_ARCH="$2"
      shift 2
      ;;
    --platform-label)
      require_arg_value "$1" "${2-}"
      PLATFORM_LABEL="$2"
      shift 2
      ;;
    --no-archive)
      NO_ARCHIVE="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PYTHON_EXE" ]]; then
  if [[ -x ".venv312/bin/python" ]]; then
    PYTHON_EXE=".venv312/bin/python"
  elif [[ -x ".venv/bin/python" ]]; then
    PYTHON_EXE=".venv/bin/python"
  else
    PYTHON_EXE="python3"
  fi
fi

export PYTHONPATH="$ROOT_DIR/src"
VERSION="${VOODOO_LOADER_BUILD_VERSION:-}"
VERSION="${VERSION#v}"
VERSION="${VERSION#V}"

if [[ -z "$VERSION" ]]; then
  if command -v git >/dev/null 2>&1; then
    VERSION="$(git describe --tags --match 'v*' --abbrev=0 2>/dev/null || true)"
    VERSION="${VERSION#v}"
    VERSION="${VERSION#V}"
  fi
fi

if [[ -z "$VERSION" ]]; then
  VERSION="$($PYTHON_EXE -c 'from voodoo_loader import __version__; print(__version__)')"
fi

if [[ -z "$VERSION" ]]; then
  echo "Failed to resolve app version" >&2
  exit 1
fi

DIST_PATH="$ROOT_DIR/dist/portable"
WORK_PATH="$ROOT_DIR/build/pyinstaller"
SPEC_PATH="$ROOT_DIR/packaging/voodoo_loader.spec"

mkdir -p "$DIST_PATH" "$WORK_PATH"

$PYTHON_EXE -m PyInstaller --noconfirm --clean --distpath "$DIST_PATH" --workpath "$WORK_PATH" "$SPEC_PATH"

BUNDLE_PATH="$DIST_PATH/VoodooLoader"
if [[ -f "$BUNDLE_PATH/VoodooLoader" ]]; then
  BINARY_PATH="$BUNDLE_PATH/VoodooLoader"
elif [[ -f "$BUNDLE_PATH/VoodooLoader-bin" ]]; then
  BINARY_PATH="$BUNDLE_PATH/VoodooLoader-bin"
else
  echo "Portable bundle was not created: $BUNDLE_PATH" >&2
  exit 1
fi

printf '%s' "$VERSION" > "$BUNDLE_PATH/voodoo_loader_version.txt"

if [[ "$NO_ARCHIVE" != "true" ]]; then
  ARCHIVE_BASE="VoodooLoader-v${VERSION}-${PLATFORM_LABEL}-${TARGET_ARCH}-portable"
  ARCHIVE_PATH="$DIST_PATH/${ARCHIVE_BASE}.tar.gz"
  rm -f "$ARCHIVE_PATH"
  tar -C "$BUNDLE_PATH" -czf "$ARCHIVE_PATH" .
  echo "Portable archive: $ARCHIVE_PATH"
fi

echo "Portable binary: $BINARY_PATH"
echo "Portable folder: $BUNDLE_PATH"

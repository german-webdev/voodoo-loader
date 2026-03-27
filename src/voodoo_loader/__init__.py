"""Voodoo Loader package."""

from __future__ import annotations

import os
import sys
from pathlib import Path

DEFAULT_VERSION = "0.1.0-alpha"
VERSION_FILENAME = "voodoo_loader_version.txt"


def _normalize_version(raw: str) -> str:
    return raw.strip().lstrip("vV").lstrip("\ufeff")


def _read_version_file(path: Path) -> str:
    try:
        if not path.is_file():
            return ""
        return _normalize_version(path.read_text(encoding="utf-8"))
    except Exception:
        return ""


def _resolve_runtime_version() -> str:
    from_env = _normalize_version(os.getenv("VOODOO_LOADER_APP_VERSION", ""))
    if from_env:
        return from_env

    if getattr(sys, "frozen", False):
        executable_dir = Path(sys.executable).resolve().parent
        from_file = _read_version_file(executable_dir / VERSION_FILENAME)
        if from_file:
            return from_file

    return DEFAULT_VERSION


__all__ = ["__version__"]
__version__ = _resolve_runtime_version()

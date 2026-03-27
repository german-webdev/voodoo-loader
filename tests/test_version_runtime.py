from __future__ import annotations

from pathlib import Path
import sys

import voodoo_loader
from voodoo_loader import DEFAULT_VERSION, _resolve_runtime_version


def test_runtime_version_prefers_environment(monkeypatch) -> None:
    monkeypatch.setenv("VOODOO_LOADER_APP_VERSION", "v9.8.7-alpha")

    assert _resolve_runtime_version() == "9.8.7-alpha"


def test_runtime_version_reads_frozen_version_file(monkeypatch) -> None:
    monkeypatch.delenv("VOODOO_LOADER_APP_VERSION", raising=False)

    fake_executable = Path("C:/portable/VoodooLoader.exe")

    monkeypatch.setattr(voodoo_loader, "_read_version_file", lambda _path: "0.1.2-alpha")
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "executable", str(fake_executable), raising=False)

    assert _resolve_runtime_version() == "0.1.2-alpha"


def test_runtime_version_falls_back_to_default(monkeypatch) -> None:
    monkeypatch.delenv("VOODOO_LOADER_APP_VERSION", raising=False)
    monkeypatch.setattr(sys, "frozen", False, raising=False)

    assert _resolve_runtime_version() == DEFAULT_VERSION
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from voodoo_loader.models.app_settings import AppSettings


class SettingsService:
    def __init__(self, app_name: str = "VoodooLoader") -> None:
        self.app_name = app_name
        self.path = self._resolve_settings_path()

    def load(self) -> AppSettings:
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                return AppSettings()
            return AppSettings.from_dict(payload)
        except Exception:
            return AppSettings()

    def save(self, settings: AppSettings) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(settings.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")

    def _resolve_settings_path(self) -> Path:
        portable = Path(self._app_dir()) / "voodoo_loader_settings.json"
        try:
            if portable.exists() or self._is_writable_dir(portable.parent):
                return portable
        except Exception:
            pass

        appdata = os.getenv("APPDATA")
        if appdata:
            return Path(appdata) / self.app_name / "settings.json"

        return Path.home() / f".{self.app_name.lower()}" / "settings.json"

    @staticmethod
    def _app_dir() -> str:
        if getattr(sys, "frozen", False):
            return str(Path(sys.executable).resolve().parent)
        return str(Path.cwd())

    @staticmethod
    def _is_writable_dir(path: Path) -> bool:
        path.mkdir(parents=True, exist_ok=True)
        test_file = path / ".write_test"
        try:
            test_file.write_text("ok", encoding="utf-8")
            return True
        finally:
            if test_file.exists():
                test_file.unlink(missing_ok=True)

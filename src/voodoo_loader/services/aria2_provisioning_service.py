from __future__ import annotations

import hashlib
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from typing import Callable


class Aria2ProvisioningService:
    DEFAULT_VERSION = "1.37.0"
    DEFAULT_ASSET = "aria2-1.37.0-win-64bit-build1.zip"

    def __init__(self) -> None:
        self.app_dir = Path.cwd()
        self.bin_dir = self.app_dir / "bin"

    def detect_aria2(self, preferred_path: str = "") -> str | None:
        preferred = preferred_path.strip()
        if preferred:
            candidate = Path(preferred)
            if candidate.exists() and candidate.is_file():
                return str(candidate)

        candidates = [
            self.bin_dir / "aria2c.exe",
            self.app_dir / "aria2c.exe",
        ]

        for candidate in candidates:
            if candidate.exists():
                return str(candidate)

        from_path = shutil.which("aria2c")
        if from_path:
            return from_path
        return None

    def ensure_aria2_available(
        self,
        auto_bootstrap: bool,
        preferred_path: str = "",
        log: Callable[[str], None] | None = None,
    ) -> str | None:
        existing = self.detect_aria2(preferred_path=preferred_path)
        if existing:
            return existing

        if not auto_bootstrap:
            return None

        try:
            return self.bootstrap_aria2(log=log)
        except Exception as exc:
            if log:
                log(f"[ERR] aria2 bootstrap failed: {exc}")
            return None

    def bootstrap_aria2(
        self,
        version: str = DEFAULT_VERSION,
        asset_name: str = DEFAULT_ASSET,
        expected_sha256: str | None = None,
        log: Callable[[str], None] | None = None,
    ) -> str:
        self.bin_dir.mkdir(parents=True, exist_ok=True)
        release_url = f"https://github.com/aria2/aria2/releases/download/release-{version}/{asset_name}"

        if log:
            log(f"[INFO] Downloading aria2 from {release_url}")

        with tempfile.TemporaryDirectory(prefix="voodoo-aria2-") as temp_dir:
            archive_path = Path(temp_dir) / asset_name
            urllib.request.urlretrieve(release_url, archive_path)

            if expected_sha256:
                digest = self._sha256_file(archive_path)
                if digest.lower() != expected_sha256.lower():
                    raise RuntimeError("SHA-256 mismatch for aria2 package")

            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(temp_dir)

            extracted = Path(temp_dir)
            exe_candidates = list(extracted.rglob("aria2c.exe"))
            if not exe_candidates:
                raise RuntimeError("aria2c.exe not found in downloaded archive")

            target = self.bin_dir / "aria2c.exe"
            shutil.copy2(exe_candidates[0], target)

            if log:
                log(f"[OK] aria2 installed to {target}")
            return str(target)

    @staticmethod
    def _sha256_file(path: Path) -> str:
        hasher = hashlib.sha256()
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                hasher.update(chunk)
        return hasher.hexdigest()

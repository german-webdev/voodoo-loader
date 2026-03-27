import shutil
from pathlib import Path
from uuid import uuid4

from voodoo_loader.services.sound_service import SoundService


def _workspace_temp_dir() -> Path:
    path = Path(".tmp") / f"test-sound-{uuid4().hex}"
    path.mkdir(parents=True, exist_ok=False)
    return path


def test_resolve_sound_path_default() -> None:
    resolved = SoundService._resolve_sound_path("start.mp3")

    assert resolved.name == "start.mp3"
    assert "resources" in resolved.parts
    assert "sounds" in resolved.parts


def test_resolve_sound_path_meipass(monkeypatch) -> None:
    meipass = _workspace_temp_dir()
    try:
        sounds_dir = meipass / "voodoo_loader" / "resources" / "sounds"
        sounds_dir.mkdir(parents=True)
        target = sounds_dir / "failure.mp3"
        target.write_bytes(b"dummy")

        monkeypatch.setattr("sys._MEIPASS", str(meipass), raising=False)

        resolved = SoundService._resolve_sound_path("failure.mp3")

        assert resolved == target
    finally:
        shutil.rmtree(meipass, ignore_errors=True)


def test_resolve_sound_path_meipass_internal_fallback(monkeypatch) -> None:
    meipass = _workspace_temp_dir()
    try:
        internal_sounds = meipass / "_internal" / "voodoo_loader" / "resources" / "sounds"
        internal_sounds.mkdir(parents=True)
        target = internal_sounds / "success.mp3"
        target.write_bytes(b"dummy")

        monkeypatch.setattr("sys._MEIPASS", str(meipass), raising=False)

        resolved = SoundService._resolve_sound_path("success.mp3")

        assert resolved == target
    finally:
        shutil.rmtree(meipass, ignore_errors=True)

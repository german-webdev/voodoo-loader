from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable
from uuid import uuid4

from PySide6.QtCore import QObject, QTimer, QUrl
from PySide6.QtMultimedia import QAudioOutput, QMediaPlayer


class SoundService(QObject):
    def __init__(self, parent: QObject | None = None, log: Callable[[str], None] | None = None) -> None:
        super().__init__(parent)
        self._log = log
        self._active_players: list[tuple[QMediaPlayer, QAudioOutput]] = []
        self._active_mci_aliases: set[str] = set()

        self._sounds = {
            "start": self._resolve_sound_path("start.mp3"),
            "success": self._resolve_sound_path("success.mp3"),
            "failure": self._resolve_sound_path("failure.mp3"),
        }

        if self._log is not None:
            for event, path in self._sounds.items():
                if not path.is_file():
                    self._log(f"[WARN] Sound file for '{event}' not found: {path}")

    def play(self, event: str) -> None:
        sound_path = self._sounds.get(event)
        if sound_path is None or not sound_path.is_file():
            if self._log is not None and sound_path is not None:
                self._log(f"[WARN] Sound file missing for '{event}': {sound_path}")
            return

        if self._play_with_mci(event, sound_path):
            if self._log is not None:
                self._log(f"[AUDIO] Playing '{event}' via MCI: {sound_path}")
            return

        try:
            audio_output = QAudioOutput(self)
            audio_output.setMuted(False)
            audio_output.setVolume(1.0)

            player = QMediaPlayer(self)
            player.setAudioOutput(audio_output)
            player.errorOccurred.connect(
                lambda _error, p=player, e=event, s=str(sound_path): self._on_error(p, e, s)
            )
            player.mediaStatusChanged.connect(
                lambda status, p=player: self._on_media_status_changed(p, status)
            )

            self._active_players.append((player, audio_output))
            player.setSource(QUrl.fromLocalFile(str(sound_path)))
            player.play()

            if self._log is not None:
                self._log(f"[AUDIO] Playing '{event}' via Qt: {sound_path}")
        except Exception as exc:  # pragma: no cover - runtime-only fallback
            if self._log is not None:
                self._log(f"[WARN] Failed to play sound '{event}' via Qt: {exc}")
            self._play_with_mci(event, sound_path)

    def _on_error(self, player: QMediaPlayer, event: str, sound_path: str) -> None:
        if self._log is not None:
            error_text = player.errorString() or "unknown media error"
            self._log(f"[WARN] Sound playback failed for '{event}' via Qt ({sound_path}): {error_text}")
        self._release_player(player)
        self._play_with_mci(event, Path(sound_path))

    def _on_media_status_changed(self, player: QMediaPlayer, status: QMediaPlayer.MediaStatus) -> None:
        if status in {
            QMediaPlayer.MediaStatus.EndOfMedia,
            QMediaPlayer.MediaStatus.InvalidMedia,
            QMediaPlayer.MediaStatus.NoMedia,
        }:
            self._release_player(player)

    def _release_player(self, player: QMediaPlayer) -> None:
        for index, (active_player, active_output) in enumerate(self._active_players):
            if active_player is not player:
                continue
            self._active_players.pop(index)
            active_player.stop()
            active_player.deleteLater()
            active_output.deleteLater()
            break

    def _play_with_mci(self, event: str, sound_path: Path) -> bool:
        if sys.platform != "win32":
            return False

        try:
            import ctypes

            alias = f"voodoo_{event}_{uuid4().hex}"
            open_command = f'open "{sound_path}" type mpegvideo alias {alias}'
            open_result = ctypes.windll.winmm.mciSendStringW(open_command, None, 0, 0)
            if open_result != 0:
                return False

            play_result = ctypes.windll.winmm.mciSendStringW(f"play {alias}", None, 0, 0)
            if play_result != 0:
                ctypes.windll.winmm.mciSendStringW(f"close {alias}", None, 0, 0)
                return False

            self._active_mci_aliases.add(alias)
            QTimer.singleShot(15_000, lambda alias_name=alias: self._close_mci_alias(alias_name))
            return True
        except Exception as exc:  # pragma: no cover - runtime-only fallback
            if self._log is not None:
                self._log(f"[WARN] MCI fallback failed for '{event}': {exc}")
            return False

    def _close_mci_alias(self, alias: str) -> None:
        if alias not in self._active_mci_aliases or sys.platform != "win32":
            return

        try:
            import ctypes

            ctypes.windll.winmm.mciSendStringW(f"close {alias}", None, 0, 0)
        finally:
            self._active_mci_aliases.discard(alias)

    @staticmethod
    def _resolve_sound_path(filename: str) -> Path:
        candidates: list[Path] = []

        meipass = getattr(sys, "_MEIPASS", "")
        if meipass:
            meipass_root = Path(meipass)
            candidates.append(meipass_root / "voodoo_loader" / "resources" / "sounds" / filename)
            candidates.append(meipass_root / "_internal" / "voodoo_loader" / "resources" / "sounds" / filename)

        if getattr(sys, "frozen", False):
            executable = getattr(sys, "executable", "")
            if executable:
                exe_dir = Path(executable).resolve().parent
                candidates.append(exe_dir / "_internal" / "voodoo_loader" / "resources" / "sounds" / filename)

        candidates.append(Path(__file__).resolve().parent.parent / "resources" / "sounds" / filename)

        for candidate in candidates:
            if candidate.is_file():
                return candidate

        return candidates[0]

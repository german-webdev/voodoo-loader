from __future__ import annotations

from voodoo_loader.main_window import MainWindow
from voodoo_loader.models.download_options import DownloadOptions


class _DummyTextInput:
    def __init__(self, value: str) -> None:
        self.value = value

    def text(self) -> str:
        return self.value


class _DummyPlainTextInput:
    def __init__(self, value: str) -> None:
        self.value = value

    def toPlainText(self) -> str:
        return self.value


class _DummyCombo:
    def __init__(self, value: str) -> None:
        self.value = value

    def currentText(self) -> str:
        return self.value


class _DummySettings:
    connections = 16
    splits = 8
    chunk_size = "1M"
    user_agent = "Mozilla/5.0"
    continue_download = True
    max_concurrent_downloads = 0


class _DummyWindow:
    def __init__(self) -> None:
        self.settings = _DummySettings()
        self.destination_combo = _DummyCombo("C:/downloads")
        self.token_input = _DummyTextInput(" token-value ")
        self.username_input = _DummyTextInput(" ignored-user ")
        self.password_input = _DummyTextInput(" ignored-pass ")
        self.headers_input = _DummyPlainTextInput(" Authorization: Bearer abc \n\n X-Test: 1 ")

    @staticmethod
    def _current_auth_mode() -> str:
        return "token"

    @staticmethod
    def _resolve_auth_payload(
        auth_mode: str,
        token: str,
        username: str,
        password: str,
        headers: list[str],
    ) -> tuple[str, str, str, list[str]]:
        return MainWindow._resolve_auth_payload(auth_mode, token, username, password, headers)


def test_build_download_options_constructs_valid_payload() -> None:
    window = _DummyWindow()

    options = MainWindow._build_download_options(window)

    assert isinstance(options, DownloadOptions)
    assert options.destination == "C:/downloads"
    assert options.connections == 16
    assert options.splits == 8
    assert options.chunk_size == "1M"
    assert options.user_agent == "Mozilla/5.0"
    assert options.continue_download is True
    assert options.token == "token-value"
    assert options.username == ""
    assert options.password == ""
    assert options.custom_headers == ["Authorization: Bearer abc", "X-Test: 1"]
    assert options.max_concurrent_downloads == 0

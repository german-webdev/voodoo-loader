from pathlib import Path

from voodoo_loader.main_window import (
    GLOBAL_PROGRESS_BASE_COLOR,
    GLOBAL_PROGRESS_CHUNK_COLOR,
    GLOBAL_PROGRESS_HEIGHT_PX,
    GLOBAL_PROGRESS_STYLESHEET,
    MainWindow,
)


def test_format_bytes_none() -> None:
    assert MainWindow._format_bytes(None) == "-"


def test_format_bytes_kib() -> None:
    assert MainWindow._format_bytes(1536) == "1.5 KiB"


def test_format_bytes_mib_and_gib() -> None:
    assert MainWindow._format_bytes(2 * 1024 * 1024) == "2.00 MiB"
    assert MainWindow._format_bytes(3 * 1024 * 1024 * 1024) == "3.00 GiB"


def test_global_progress_style_constants() -> None:
    assert GLOBAL_PROGRESS_HEIGHT_PX == 15
    assert GLOBAL_PROGRESS_CHUNK_COLOR == "#00BB0A"
    assert GLOBAL_PROGRESS_BASE_COLOR == "#ACAFB5"
    assert "background-color: #00BB0A;" in GLOBAL_PROGRESS_STYLESHEET
    assert "background-color: #ACAFB5;" in GLOBAL_PROGRESS_STYLESHEET

def test_global_progress_percentage_text_is_enabled() -> None:
    source = Path('src/voodoo_loader/main_window.py').read_text(encoding='utf-8')
    assert 'self.global_progress.setTextVisible(True)' in source
    assert 'self.global_progress.setFormat("%p%")' in source

from voodoo_loader.main_window import (
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
    assert GLOBAL_PROGRESS_HEIGHT_PX == 10
    assert GLOBAL_PROGRESS_CHUNK_COLOR == "#00BB0A"
    assert "background-color: #00BB0A;" in GLOBAL_PROGRESS_STYLESHEET
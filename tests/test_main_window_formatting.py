from voodoo_loader.main_window import MainWindow


def test_format_bytes_none() -> None:
    assert MainWindow._format_bytes(None) == "-"


def test_format_bytes_kib() -> None:
    assert MainWindow._format_bytes(1536) == "1.5 KiB"


def test_format_bytes_mib_and_gib() -> None:
    assert MainWindow._format_bytes(2 * 1024 * 1024) == "2.00 MiB"
    assert MainWindow._format_bytes(3 * 1024 * 1024 * 1024) == "3.00 GiB"

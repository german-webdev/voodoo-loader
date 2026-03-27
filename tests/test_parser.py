from voodoo_loader.parsers.aria2_output_parser import Aria2OutputParser


def test_parse_progress_line() -> None:
    parser = Aria2OutputParser()
    line = "[#2089b0 400.0KiB/33.2MiB(1%) CN:1 DL:115.7KiB ETA:4m51s]"

    state = parser.parse_line(line)

    assert state is not None
    assert state.percent == 1.0
    assert state.downloaded_bytes == int(400.0 * 1024)
    assert state.total_bytes == int(33.2 * 1024 * 1024)
    assert state.speed_bps == int(115.7 * 1024)
    assert state.eta_seconds == 4 * 60 + 51


def test_parse_non_progress_line_returns_none() -> None:
    parser = Aria2OutputParser()
    assert parser.parse_line("[NOTICE] Downloading...") is None

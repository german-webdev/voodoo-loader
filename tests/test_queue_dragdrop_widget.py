from __future__ import annotations

from PySide6.QtCore import QPointF
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QMimeData

from voodoo_loader.main_window import QueueTableWidget


class _FakeDropEvent:
    def __init__(self, source, mime_data: QMimeData, pos: QPointF) -> None:
        self._source = source
        self._mime_data = mime_data
        self._pos = pos
        self.accepted = False
        self.ignored = False

    def source(self):
        return self._source

    def mimeData(self) -> QMimeData:
        return self._mime_data

    def position(self) -> QPointF:
        return self._pos

    def acceptProposedAction(self) -> None:
        self.accepted = True

    def ignore(self) -> None:
        self.ignored = True


class _FakeDragEvent:
    def __init__(self, source, mime_data: QMimeData) -> None:
        self._source = source
        self._mime_data = mime_data
        self.accepted = False

    def source(self):
        return self._source

    def mimeData(self) -> QMimeData:
        return self._mime_data

    def acceptProposedAction(self) -> None:
        self.accepted = True


def _ensure_app() -> QApplication:
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app


def _make_widget() -> QueueTableWidget:
    _ensure_app()
    widget = QueueTableWidget()
    widget.setColumnCount(3)
    widget.setRowCount(4)
    widget.resize(640, 360)
    return widget


def test_internal_drag_source_accepts_widget_and_viewport() -> None:
    widget = _make_widget()

    assert widget._is_internal_drag_source(widget) is True
    assert widget._is_internal_drag_source(widget.viewport()) is True
    assert widget._is_internal_drag_source(object()) is False


def test_drop_event_accepts_viewport_source_and_emits_rows() -> None:
    widget = _make_widget()
    emitted: list[tuple[list[int], int]] = []
    widget.rows_dropped.connect(lambda rows, target: emitted.append((list(rows), int(target))))

    mime = QMimeData()
    mime.setData(widget.DRAG_ROWS_MIME, widget._encode_rows([1, 2]))
    event = _FakeDropEvent(widget.viewport(), mime, QPointF(10.0, 9999.0))

    widget.dropEvent(event)

    assert event.accepted is True
    assert event.ignored is False
    assert emitted == [([1, 2], 4)]


def test_drag_enter_accepts_internal_viewport_mime() -> None:
    widget = _make_widget()

    mime = QMimeData()
    mime.setData(widget.DRAG_ROWS_MIME, widget._encode_rows([0]))
    event = _FakeDragEvent(widget.viewport(), mime)

    widget.dragEnterEvent(event)

    assert event.accepted is True

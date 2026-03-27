from voodoo_loader.main_window import COL_ID, MainWindow, QueueTableWidget


class _DummyItem:
    def __init__(self, value: str) -> None:
        self._value = value

    def text(self) -> str:
        return self._value


class _DummyQueueTable:
    def __init__(self, ids: list[str]) -> None:
        self.ids = list(ids)

    def rowCount(self) -> int:
        return len(self.ids)

    def item(self, row: int, col: int):
        if col != COL_ID:
            return None
        if 0 <= row < len(self.ids):
            return _DummyItem(self.ids[row])
        return None

    def clearSelection(self) -> None:
        return None

    def selectRow(self, _row: int) -> None:
        return None


class _DummyAria2Service:
    def __init__(self) -> None:
        self.reorders: list[list[str]] = []

    def reorder_pending(self, ordered_item_ids: list[str]) -> None:
        self.reorders.append(list(ordered_item_ids))


class _DummyWindow:
    def __init__(self, ids: list[str]) -> None:
        self.queue_order = list(ids)
        self.row_for_item = {item_id: idx for idx, item_id in enumerate(ids)}
        self.queue_table = _DummyQueueTable(ids)
        self.aria2_service = _DummyAria2Service()
        self.rebuild_count = 0
        self.saved_count = 0
        self.selected_after_drop: list[str] = []

    @staticmethod
    def _reorder_ids_by_drag_drop(current_ids: list[str], source_rows: list[int], target_row: int) -> list[str]:
        return MainWindow._reorder_ids_by_drag_drop(current_ids, source_rows, target_row)

    def _rebuild_queue_table(self) -> None:
        self.rebuild_count += 1
        self.queue_table.ids = list(self.queue_order)

    def _select_items(self, item_ids: list[str]) -> None:
        self.selected_after_drop = list(item_ids)

    def _save_queue_snapshot(self) -> None:
        self.saved_count += 1


def test_drag_drop_reorder_preserves_all_items() -> None:
    original = ["a", "b", "c", "d", "e"]

    reordered = MainWindow._reorder_ids_by_drag_drop(original, [1, 2], 5)

    assert reordered == ["a", "d", "e", "b", "c"]
    assert len(reordered) == len(original)
    assert set(reordered) == set(original)


def test_queue_rows_dropped_updates_order_without_loss() -> None:
    window = _DummyWindow(["a", "b", "c", "d"])

    MainWindow._on_queue_rows_dropped(window, [1], 4)

    assert window.queue_order == ["a", "c", "d", "b"]
    assert set(window.queue_order) == {"a", "b", "c", "d"}
    assert len(window.queue_order) == 4
    assert window.rebuild_count == 1
    assert window.saved_count == 1
    assert window.aria2_service.reorders == [["a", "c", "d", "b"]]
    assert window.selected_after_drop == ["b"]


def test_queue_rows_dropped_ignores_invalid_source_rows() -> None:
    window = _DummyWindow(["a", "b", "c"])

    MainWindow._on_queue_rows_dropped(window, [99], 1)

    assert window.queue_order == ["a", "b", "c"]
    assert window.rebuild_count == 0
    assert window.saved_count == 0
    assert window.aria2_service.reorders == []


def test_queue_table_widget_row_mime_roundtrip() -> None:
    encoded = QueueTableWidget._encode_rows([3, 1, 3, 2])

    decoded = QueueTableWidget._decode_rows(encoded)

    assert decoded == [1, 2, 3]

from voodoo_loader.main_window import MainWindow
from voodoo_loader.models.queue_item import QueueItem, QueueItemStatus


class _DummyAria2Service:
    def __init__(self) -> None:
        self.removed_ids: list[str] = []
        self.enqueued_ids: list[str] = []
        self.reorder_calls = 0
        self.is_running = False

    def remove_pending_item(self, item_id: str) -> bool:
        self.removed_ids.append(item_id)
        return True

    def enqueue_items(self, items: list[QueueItem]) -> None:
        self.enqueued_ids.extend(item.item_id for item in items)

    def reorder_pending(self, _ordered_item_ids: list[str]) -> None:
        self.reorder_calls += 1


class _DummyTextInput:
    def __init__(self, value: str = "") -> None:
        self.value = value

    def text(self) -> str:
        return self.value


class _DummyWindow:
    def __init__(self) -> None:
        self.queue_items: dict[str, QueueItem] = {}
        self.queue_order: list[str] = []
        self.aria2_service = _DummyAria2Service()
        self.logs: list[str] = []
        self.rebuilt = 0
        self.updated = 0
        self.saved = 0
        self.rows_updated = 0
        self.selected_ids: list[str] = []
        self.filename_input = _DummyTextInput()

    def _append_log(self, message: str) -> None:
        self.logs.append(message)

    def _rebuild_queue_table(self) -> None:
        self.rebuilt += 1

    def _update_transfer_metadata(self) -> None:
        self.updated += 1

    def _save_queue_snapshot(self) -> None:
        self.saved += 1


    def _append_or_update_row(self, _item: QueueItem) -> None:
        self.rows_updated += 1

    @staticmethod
    def _is_retryable_status(status: QueueItemStatus) -> bool:
        return MainWindow._is_retryable_status(status)


    def _selected_item_ids(self) -> list[str]:
        return list(self.selected_ids)

    @staticmethod
    def t(key: str) -> str:
        translations = {
            "filename_ignored_multi": "Custom file name is applied only when a single queued item is downloaded.",
        }
        return translations.get(key, key)


def _item(item_id: str, status: QueueItemStatus) -> QueueItem:
    return QueueItem(item_id=item_id, url=f"https://example.com/{item_id}.bin", destination="C:/tmp", status=status)


def test_remove_items_skips_active_and_removes_others() -> None:
    window = _DummyWindow()
    window.queue_items = {
        "queued": _item("queued", QueueItemStatus.QUEUED),
        "failed": _item("failed", QueueItemStatus.FAILED),
        "active": _item("active", QueueItemStatus.DOWNLOADING),
    }
    window.queue_order = ["queued", "failed", "active"]

    removed = MainWindow._remove_items(window, ["queued", "failed", "active"])

    assert removed == 2
    assert "queued" not in window.queue_items
    assert "failed" not in window.queue_items
    assert "active" in window.queue_items
    assert window.queue_order == ["active"]
    assert window.rebuilt == 1
    assert window.updated == 1
    assert window.saved == 1
    assert any("Cannot remove active item active" in line for line in window.logs)


def test_queued_order_ids_extracts_only_queued_in_order() -> None:
    window = _DummyWindow()
    window.queue_items = {
        "done": _item("done", QueueItemStatus.COMPLETED),
        "q1": _item("q1", QueueItemStatus.QUEUED),
        "failed": _item("failed", QueueItemStatus.FAILED),
        "q2": _item("q2", QueueItemStatus.QUEUED),
    }
    window.queue_order = ["done", "q1", "failed", "q2"]

    queued = MainWindow._queued_order_ids(window)

    assert queued == ["q1", "q2"]


def test_reorder_queued_ids_up_and_down_keep_relative_selected_order() -> None:
    queued = ["a", "b", "c", "d"]

    up = MainWindow._reorder_queued_ids(queued, {"c", "d"}, "up")
    down = MainWindow._reorder_queued_ids(queued, {"a", "b"}, "down")

    assert up == ["a", "c", "d", "b"]
    assert down == ["c", "a", "b", "d"]


def test_reorder_queued_ids_top_and_bottom_keep_relative_selected_order() -> None:
    queued = ["a", "b", "c", "d"]

    top = MainWindow._reorder_queued_ids(queued, {"c", "a"}, "top")
    bottom = MainWindow._reorder_queued_ids(queued, {"c", "a"}, "bottom")

    assert top == ["a", "c", "b", "d"]
    assert bottom == ["b", "d", "a", "c"]



def test_reorder_ids_by_drag_drop_moves_block_preserving_relative_order() -> None:
    current = ["a", "b", "c", "d", "e"]

    reordered = MainWindow._reorder_ids_by_drag_drop(current, [1, 2], 5)

    assert reordered == ["a", "d", "e", "b", "c"]


def test_reorder_ids_by_drag_drop_moves_item_up() -> None:
    current = ["a", "b", "c", "d"]

    reordered = MainWindow._reorder_ids_by_drag_drop(current, [3], 1)

    assert reordered == ["a", "d", "b", "c"]
def test_retry_items_resets_retryable_and_requeues() -> None:
    window = _DummyWindow()
    failed = _item("failed", QueueItemStatus.FAILED)
    failed.progress_percent = 37.0
    failed.error_message = "something"

    completed = _item("done", QueueItemStatus.COMPLETED)
    window.queue_items = {"failed": failed, "done": completed}
    window.queue_order = ["failed", "done"]

    retried = MainWindow._retry_items(window, ["failed", "done"])

    assert retried == 1
    assert failed.status == QueueItemStatus.QUEUED
    assert failed.progress_percent == 0.0
    assert failed.error_message is None
    assert window.aria2_service.enqueued_ids == ["failed"]
    assert window.aria2_service.reorder_calls == 1
    assert window.rows_updated == 1
    assert window.updated == 1
    assert window.saved == 1


def test_selected_action_counts_and_retryable_presence() -> None:
    window = _DummyWindow()
    window.queue_items = {
        "q": _item("q", QueueItemStatus.QUEUED),
        "f": _item("f", QueueItemStatus.FAILED),
        "d": _item("d", QueueItemStatus.DOWNLOADING),
    }
    window.queue_order = ["q", "f", "d"]
    window.selected_ids = ["q", "f", "d"]

    counts = MainWindow._selected_action_counts(window)
    has_retryable = MainWindow._has_retryable_in_queue(window)

    assert counts == (1, 1, 2)
    assert has_retryable is True

def test_apply_single_item_filename_override_applies_and_ignores_multi() -> None:
    window = _DummyWindow()
    window.filename_input = _DummyTextInput("custom-name.bin")

    single_item = _item("single", QueueItemStatus.QUEUED)
    MainWindow._apply_single_item_filename_override(window, [single_item], log_if_ignored=True)

    assert single_item.filename_override == "custom-name.bin"
    assert window.logs == []

    window.logs.clear()
    first = _item("first", QueueItemStatus.QUEUED)
    second = _item("second", QueueItemStatus.QUEUED)
    MainWindow._apply_single_item_filename_override(window, [first, second], log_if_ignored=True)

    assert first.filename_override is None
    assert second.filename_override is None
    assert any("single queued item" in line for line in window.logs)


def test_resolve_auth_payload_by_mode() -> None:
    token_payload = MainWindow._resolve_auth_payload(
        "token",
        " secret-token ",
        "user",
        "pass",
        [" Cookie: a=1 ", "", "X-Test: 1"],
    )
    basic_payload = MainWindow._resolve_auth_payload(
        "basic",
        "secret-token",
        " user ",
        "pass",
        ["Cookie: a=1"],
    )
    none_payload = MainWindow._resolve_auth_payload(
        "none",
        "secret-token",
        "user",
        "pass",
        ["Cookie: a=1"],
    )

    assert token_payload == ("secret-token", "", "", ["Cookie: a=1", "X-Test: 1"])
    assert basic_payload == ("", "user", "pass", [])
    assert none_payload == ("", "", "", [])


def test_resolve_auth_payload_normalizes_unknown_mode_to_none() -> None:
    payload = MainWindow._resolve_auth_payload(
        "unknown",
        "secret-token",
        "user",
        "pass",
        ["Cookie: a=1"],
    )

    assert payload == ("", "", "", [])

def test_validate_auth_payload_rules() -> None:
    token_missing = MainWindow._validate_auth_payload("token", "", "", "", ["", "   "])
    token_ok = MainWindow._validate_auth_payload("token", " abc ", "", "", [""])
    token_with_header_ok = MainWindow._validate_auth_payload("token", "", "", "", ["Cookie: a=1"])

    basic_missing_user = MainWindow._validate_auth_payload("basic", "", "", "pass", [])
    basic_missing_password = MainWindow._validate_auth_payload("basic", "", "user", "", [])
    basic_ok = MainWindow._validate_auth_payload("basic", "", "user", "pass", [])

    none_ok = MainWindow._validate_auth_payload("none", "", "", "", [])

    assert token_missing == "auth_validation_token_or_header_required"
    assert token_ok is None
    assert token_with_header_ok is None
    assert basic_missing_user == "auth_validation_username_required"
    assert basic_missing_password == "auth_validation_password_required"
    assert basic_ok is None
    assert none_ok is None


def test_validate_auth_payload_unknown_mode_is_ignored() -> None:
    result = MainWindow._validate_auth_payload("unknown", "", "", "", [])

    assert result is None

def test_compute_persisted_auth_state() -> None:
    persisted = MainWindow._compute_persisted_auth_state(
        True,
        " secret-token ",
        True,
        " user ",
    )
    disabled = MainWindow._compute_persisted_auth_state(
        False,
        " secret-token ",
        False,
        " user ",
    )

    assert persisted == (True, "secret-token", True, "user")
    assert disabled == (False, "", False, "")





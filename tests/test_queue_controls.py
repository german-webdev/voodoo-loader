from __future__ import annotations

from collections import deque
from typing import cast

from PySide6.QtCore import QProcess

from voodoo_loader.models.download_options import DownloadOptions
from voodoo_loader.models.queue_item import QueueItem
from voodoo_loader.services.aria2_service import Aria2Service


class _TestableAria2Service(Aria2Service):
    def __init__(self) -> None:
        super().__init__()
        self.started: list[str] = []

    def _start_item(self, item: QueueItem) -> None:
        self.started.append(item.item_id)
        self.active[item.item_id] = cast(QProcess, object())


def _options(max_concurrent: int) -> DownloadOptions:
    return DownloadOptions(
        destination="C:/tmp",
        connections=8,
        splits=8,
        chunk_size="1M",
        user_agent="UA",
        continue_download=True,
        max_concurrent_downloads=max_concurrent,
    )


def test_enqueue_allows_requeue_of_existing_item_id() -> None:
    service = Aria2Service()
    item = QueueItem(item_id="item-1", url="https://example.com/a.bin", destination="C:/tmp")

    service.enqueue_items([item])
    assert [queued.item_id for queued in service.pending] == ["item-1"]

    service.pending.clear()
    service.enqueue_items([item])

    assert [queued.item_id for queued in service.pending] == ["item-1"]


def test_reorder_pending_respects_external_queue_order() -> None:
    service = Aria2Service()
    items = [
        QueueItem(item_id="a", url="https://example.com/a.bin", destination="C:/tmp"),
        QueueItem(item_id="b", url="https://example.com/b.bin", destination="C:/tmp"),
        QueueItem(item_id="c", url="https://example.com/c.bin", destination="C:/tmp"),
    ]
    service.enqueue_items(items)

    service.reorder_pending(["c", "a", "b"])

    assert [queued.item_id for queued in service.pending] == ["c", "a", "b"]


def test_pump_queue_unlimited_starts_all_pending_items() -> None:
    service = _TestableAria2Service()
    service.download_options = _options(max_concurrent=0)

    items = [
        QueueItem(item_id="a", url="https://example.com/a.bin", destination="C:/tmp"),
        QueueItem(item_id="b", url="https://example.com/b.bin", destination="C:/tmp"),
        QueueItem(item_id="c", url="https://example.com/c.bin", destination="C:/tmp"),
    ]
    service.pending = deque(items)
    service.items = {item.item_id: item for item in items}

    service._pump_queue()

    assert service.started == ["a", "b", "c"]


def test_pump_queue_limited_starts_up_to_configured_parallelism() -> None:
    service = _TestableAria2Service()
    service.download_options = _options(max_concurrent=1)

    items = [
        QueueItem(item_id="a", url="https://example.com/a.bin", destination="C:/tmp"),
        QueueItem(item_id="b", url="https://example.com/b.bin", destination="C:/tmp"),
    ]
    service.pending = deque(items)
    service.items = {item.item_id: item for item in items}

    service._pump_queue()

    assert service.started == ["a"]
    assert [queued.item_id for queued in service.pending] == ["b"]

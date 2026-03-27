from voodoo_loader.models.queue_item import QueueItem, QueueItemStatus
from voodoo_loader.services.aria2_service import Aria2Service


def test_enqueue_items_detaches_service_state_from_ui_items() -> None:
    service = Aria2Service()
    item = QueueItem(item_id="abc12345", url="https://example.com/file.bin", destination="C:/tmp")

    service.enqueue_items([item])

    stored = service.items[item.item_id]
    assert stored is not item

    stored.status = QueueItemStatus.DOWNLOADING
    assert item.status == QueueItemStatus.QUEUED

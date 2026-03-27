from voodoo_loader.main_window import MainWindow
from voodoo_loader.models.queue_item import QueueItemStatus


def test_is_retryable_status_for_failed() -> None:
    assert MainWindow._is_retryable_status(QueueItemStatus.FAILED) is True


def test_is_retryable_status_for_canceled() -> None:
    assert MainWindow._is_retryable_status(QueueItemStatus.CANCELED) is True


def test_is_retryable_status_for_downloading() -> None:
    assert MainWindow._is_retryable_status(QueueItemStatus.DOWNLOADING) is False

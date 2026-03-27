from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum


class QueueItemStatus(StrEnum):
    QUEUED = "Queued"
    STARTING = "Starting"
    DOWNLOADING = "Downloading"
    PAUSED = "Paused"
    COMPLETED = "Completed"
    FAILED = "Failed"
    CANCELED = "Canceled"


class QueueItemPriority(StrEnum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


@dataclass(slots=True)
class QueueItem:
    item_id: str
    url: str
    destination: str
    filename_override: str | None = None
    status: QueueItemStatus = QueueItemStatus.QUEUED
    priority: QueueItemPriority = QueueItemPriority.MEDIUM
    selected: bool = False
    progress_percent: float = 0.0
    speed_bps: int | None = None
    eta_seconds: int | None = None
    downloaded_bytes: int | None = None
    total_bytes: int | None = None
    error_message: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

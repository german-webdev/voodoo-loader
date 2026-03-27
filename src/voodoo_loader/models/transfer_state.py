from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TransferState:
    percent: float | None = None
    downloaded_bytes: int | None = None
    total_bytes: int | None = None
    remaining_bytes: int | None = None
    speed_bps: int | None = None
    eta_seconds: int | None = None
    status_text: str | None = None

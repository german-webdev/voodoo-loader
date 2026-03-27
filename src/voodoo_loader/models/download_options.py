from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class DownloadOptions:
    destination: str
    connections: int
    splits: int
    chunk_size: str
    user_agent: str
    continue_download: bool
    token: str = ""
    username: str = ""
    password: str = ""
    custom_headers: list[str] = field(default_factory=list)
    max_concurrent_downloads: int = 0

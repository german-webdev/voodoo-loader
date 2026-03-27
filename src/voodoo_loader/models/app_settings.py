from __future__ import annotations

from dataclasses import dataclass, field

from voodoo_loader.models.queue_item import QueueItemPriority


@dataclass(slots=True)
class AppSettings:
    language: str = "en"
    recent_folders: list[str] = field(default_factory=list)

    # Speed/profile options
    last_preset: str = "Balanced"
    connections: int = 16
    splits: int = 16
    chunk_size: str = "1M"
    continue_download: bool = True
    user_agent: str = "Mozilla/5.0"
    max_concurrent_downloads: int = 0

    # aria2 provisioning
    auto_bootstrap_aria2: bool = True
    aria2_custom_path: str = ""

    # Authentication persistence (opt-in)
    save_token: bool = False
    saved_token: str = ""
    save_credentials: bool = False
    saved_username: str = ""
    auth_headers: list[str] = field(default_factory=list)

    # Queue/UI persistence
    persisted_queue: list[dict[str, str]] = field(default_factory=list)
    window_geometry_b64: str = ""
    queue_column_widths: list[int] = field(default_factory=list)
    show_logs: bool = True

    # Backward-compatible auth mode state
    auth_section_expanded: bool = False
    auth_mode: str = "none"

    # Updates
    update_repository: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "AppSettings":
        persisted_queue_raw = data.get("persisted_queue", [])
        persisted_queue: list[dict[str, str]] = []
        if isinstance(persisted_queue_raw, list):
            for item in persisted_queue_raw:
                if not isinstance(item, dict):
                    continue
                url = str(item.get("url", "")).strip()
                destination = str(item.get("destination", "")).strip()
                filename_override = str(item.get("filename_override", "")).strip()
                priority = str(item.get("priority", QueueItemPriority.MEDIUM.value)).strip().title()
                if priority not in {
                    QueueItemPriority.HIGH.value,
                    QueueItemPriority.MEDIUM.value,
                    QueueItemPriority.LOW.value,
                }:
                    priority = QueueItemPriority.MEDIUM.value
                if not url or not destination:
                    continue
                persisted_queue.append(
                    {
                        "url": url,
                        "destination": destination,
                        "filename_override": filename_override,
                        "priority": priority,
                    }
                )

        queue_column_widths_raw = data.get("queue_column_widths", [])
        queue_column_widths: list[int] = []

        if isinstance(queue_column_widths_raw, list):
            for value in queue_column_widths_raw:
                try:
                    width = int(value)
                except Exception:
                    continue
                if width > 0:
                    queue_column_widths.append(width)

        auth_mode_raw = str(data.get("auth_mode", "")).strip().lower()
        if auth_mode_raw not in {"none", "token", "basic"}:
            if str(data.get("saved_token", "")).strip():
                auth_mode_raw = "token"
            elif str(data.get("saved_username", "")).strip():
                auth_mode_raw = "basic"
            else:
                auth_mode_raw = "none"

        auth_headers_raw = data.get("auth_headers", [])
        auth_headers: list[str] = []
        if isinstance(auth_headers_raw, list):
            for value in auth_headers_raw:
                cleaned = str(value).strip()
                if cleaned:
                    auth_headers.append(cleaned)

        return cls(
            language=str(data.get("language", "en")),
            recent_folders=[str(x) for x in data.get("recent_folders", []) if str(x).strip()],
            last_preset=str(data.get("last_preset", "Balanced")),
            connections=max(1, min(128, int(data.get("connections", 16)))),
            splits=max(1, min(128, int(data.get("splits", 16)))),
            chunk_size=str(data.get("chunk_size", "1M")).strip() or "1M",
            continue_download=bool(data.get("continue_download", True)),
            user_agent=str(data.get("user_agent", "Mozilla/5.0")),
            max_concurrent_downloads=max(0, min(32, int(data.get("max_concurrent_downloads", 0)))),
            auto_bootstrap_aria2=bool(data.get("auto_bootstrap_aria2", True)),
            aria2_custom_path=str(data.get("aria2_custom_path", "")),
            save_token=bool(data.get("save_token", False)),
            saved_token=str(data.get("saved_token", "")),
            save_credentials=bool(data.get("save_credentials", False)),
            saved_username=str(data.get("saved_username", "")),
            auth_headers=auth_headers,
            persisted_queue=persisted_queue,
            window_geometry_b64=str(data.get("window_geometry_b64", "")),
            queue_column_widths=queue_column_widths,
            show_logs=bool(data.get("show_logs", True)),
            auth_section_expanded=bool(data.get("auth_section_expanded", False)),
            auth_mode=auth_mode_raw,
            update_repository=str(data.get("update_repository", "")).strip(),
        )

    def to_dict(self) -> dict:
        return {
            "language": self.language,
            "recent_folders": self.recent_folders,
            "last_preset": self.last_preset,
            "connections": self.connections,
            "splits": self.splits,
            "chunk_size": self.chunk_size,
            "continue_download": self.continue_download,
            "user_agent": self.user_agent,
            "max_concurrent_downloads": self.max_concurrent_downloads,
            "auto_bootstrap_aria2": self.auto_bootstrap_aria2,
            "aria2_custom_path": self.aria2_custom_path,
            "save_token": self.save_token,
            "saved_token": self.saved_token if self.save_token else "",
            "save_credentials": self.save_credentials,
            "saved_username": self.saved_username if self.save_credentials else "",
            "auth_headers": self.auth_headers,
            "persisted_queue": self.persisted_queue,
            "window_geometry_b64": self.window_geometry_b64,
            "queue_column_widths": self.queue_column_widths,
            "show_logs": self.show_logs,
            "auth_section_expanded": self.auth_section_expanded,
            "auth_mode": self.auth_mode,
            "update_repository": self.update_repository,
        }

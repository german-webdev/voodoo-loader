from __future__ import annotations

import subprocess
from collections import deque
from dataclasses import asdict, replace
from urllib.parse import unquote, urlparse

from PySide6.QtCore import QObject, QProcess, QTimer, Signal

from voodoo_loader.models.download_options import DownloadOptions
from voodoo_loader.models.queue_item import QueueItem, QueueItemStatus
from voodoo_loader.parsers.aria2_output_parser import Aria2OutputParser


def mask_command_for_log(command_tokens: list[str]) -> str:
    masked: list[str] = []
    for token in command_tokens:
        lowered = token.lower()
        if lowered.startswith("authorization: bearer "):
            masked.append("Authorization: Bearer ***")
            continue
        if lowered.startswith("authorization:"):
            masked.append("Authorization: ***")
            continue
        masked.append(token)
    return subprocess.list2cmdline(masked)


class Aria2Service(QObject):
    log_emitted = Signal(str)
    item_changed = Signal(str, dict)
    queue_counts_changed = Signal(int, int, int)
    overall_progress_changed = Signal(float)
    queue_finished = Signal(int, int, bool)
    status_changed = Signal(str)

    def __init__(self, parent: QObject | None = None) -> None:
        super().__init__(parent)
        self.parser = Aria2OutputParser()
        self.aria2_path: str | None = None
        self.download_options: DownloadOptions | None = None

        self.pending: deque[QueueItem] = deque()
        self.active: dict[str, QProcess] = {}
        self.items: dict[str, QueueItem] = {}
        self._stderr_lines: dict[str, deque[str]] = {}

        self._running = False
        self._stop_requested = False
        self._completed = 0
        self._failed = 0

    @property
    def is_running(self) -> bool:
        return self._running

    def set_aria2_path(self, path: str) -> None:
        self.aria2_path = path

    def set_download_options(self, options: DownloadOptions) -> None:
        self.download_options = options

    def enqueue_items(self, items: list[QueueItem]) -> None:
        pending_ids = {queued.item_id for queued in self.pending}
        for item in items:
            queued_item = replace(item)
            self.items[queued_item.item_id] = queued_item
            if queued_item.item_id in self.active or queued_item.item_id in pending_ids:
                continue
            self.pending.append(queued_item)
            pending_ids.add(queued_item.item_id)
            self._emit_item(queued_item)

        self._emit_counts()
        if self._running:
            self._pump_queue()

    def reorder_pending(self, ordered_item_ids: list[str]) -> None:
        if not self.pending:
            return
        order = {item_id: index for index, item_id in enumerate(ordered_item_ids)}
        fallback = len(order)
        self.pending = deque(sorted(self.pending, key=lambda item: order.get(item.item_id, fallback)))
        self._emit_counts()

    def remove_pending_item(self, item_id: str) -> bool:
        if item_id in self.active:
            return False
        kept = deque([x for x in self.pending if x.item_id != item_id])
        removed = len(kept) != len(self.pending)
        self.pending = kept
        if removed:
            item = self.items.get(item_id)
            if item:
                item.status = QueueItemStatus.CANCELED
                self._emit_item(item)
            self._emit_counts()
            self._update_overall_progress()
        return removed

    def start(self) -> None:
        if self._running:
            return
        if not self.aria2_path:
            raise RuntimeError("aria2 path is not configured")
        if not self.download_options:
            raise RuntimeError("download options are not configured")

        self._completed = 0
        self._failed = 0
        self._running = True
        self._stop_requested = False
        self.status_changed.emit("Queue started")
        self._pump_queue()

    def stop_all(self) -> None:
        if not self._running:
            return

        self._stop_requested = True
        self.status_changed.emit("Stopping queue...")

        while self.pending:
            item = self.pending.popleft()
            item.status = QueueItemStatus.CANCELED
            self._emit_item(item)

        for item_id, proc in list(self.active.items()):
            if proc.state() != QProcess.ProcessState.NotRunning:
                proc.terminate()
                QTimer.singleShot(2000, lambda p=proc: self._kill_if_alive(p))
            active_item = self.items.get(item_id)
            if active_item and active_item.status not in {QueueItemStatus.COMPLETED, QueueItemStatus.FAILED}:
                active_item.status = QueueItemStatus.CANCELED
                self._emit_item(active_item)

        self._emit_counts()

    def _pump_queue(self) -> None:
        if not self.download_options:
            return

        configured = int(self.download_options.max_concurrent_downloads)
        if configured <= 0:
            max_parallel = len(self.active) + len(self.pending)
        else:
            max_parallel = max(1, min(32, configured))

        while len(self.active) < max_parallel and self.pending and not self._stop_requested:
            item = self.pending.popleft()
            self._start_item(item)

        self._emit_counts()
        self._update_overall_progress()

        if not self.active and not self.pending:
            self._finish_queue()

    def _start_item(self, item: QueueItem) -> None:
        assert self.download_options is not None
        assert self.aria2_path is not None

        args = self.build_command_args(item, self.download_options)
        command_preview = mask_command_for_log([self.aria2_path, *args])
        self.log_emitted.emit(f"[START] {command_preview}")

        process = QProcess(self)
        process.setProgram(self.aria2_path)
        process.setArguments(args)

        process.readyReadStandardOutput.connect(lambda item_id=item.item_id: self._on_output(item_id))
        process.readyReadStandardError.connect(lambda item_id=item.item_id: self._on_error_output(item_id))
        process.finished.connect(
            lambda code, _status, item_id=item.item_id: self._on_finished(item_id, int(code))
        )

        self.active[item.item_id] = process
        self._stderr_lines[item.item_id] = deque(maxlen=20)

        item.status = QueueItemStatus.STARTING
        self._emit_item(item)
        process.start()

        item.status = QueueItemStatus.DOWNLOADING
        self._emit_item(item)

    def _on_output(self, item_id: str) -> None:
        process = self.active.get(item_id)
        item = self.items.get(item_id)
        if not process or not item:
            return

        raw = bytes(process.readAllStandardOutput().data()).decode("utf-8", errors="replace")
        for line in raw.splitlines():
            self.log_emitted.emit(f"[{item_id}] {line}")
            transfer = self.parser.parse_line(line)
            if transfer is None:
                continue
            if transfer.percent is not None:
                item.progress_percent = max(0.0, min(100.0, transfer.percent))
            item.downloaded_bytes = transfer.downloaded_bytes
            item.total_bytes = transfer.total_bytes
            item.speed_bps = transfer.speed_bps
            item.eta_seconds = transfer.eta_seconds
            item.status = QueueItemStatus.DOWNLOADING
            self._emit_item(item)

        self._update_overall_progress()

    def _on_error_output(self, item_id: str) -> None:
        process = self.active.get(item_id)
        if not process:
            return

        raw = bytes(process.readAllStandardError().data()).decode("utf-8", errors="replace")
        ring = self._stderr_lines.setdefault(item_id, deque(maxlen=20))
        for line in raw.splitlines():
            if line.strip():
                ring.append(line.strip())
            self.log_emitted.emit(f"[{item_id}] {line}")

    def _on_finished(self, item_id: str, exit_code: int) -> None:
        process = self.active.pop(item_id, None)
        if process:
            process.deleteLater()

        stderr_lines = list(self._stderr_lines.pop(item_id, []))
        item = self.items.get(item_id)
        if item is None:
            self._pump_queue()
            return

        if self._stop_requested:
            item.status = QueueItemStatus.CANCELED
        elif exit_code == 0:
            item.status = QueueItemStatus.COMPLETED
            item.progress_percent = 100.0
            self._completed += 1
        else:
            item.status = QueueItemStatus.FAILED
            item.error_message = self._build_error_message(exit_code, stderr_lines)
            self._failed += 1

        self._emit_item(item)
        self._emit_counts()
        self._update_overall_progress()
        self._pump_queue()

    def _finish_queue(self) -> None:
        if not self._running:
            return

        stopped = self._stop_requested
        self._running = False
        self._stop_requested = False

        if stopped:
            self.status_changed.emit("Queue stopped")
        else:
            self.status_changed.emit("Queue finished")

        self.queue_finished.emit(self._completed, self._failed, stopped)

    def _emit_item(self, item: QueueItem) -> None:
        self.item_changed.emit(item.item_id, asdict(item))

    def _emit_counts(self) -> None:
        self.queue_counts_changed.emit(len(self.active), len(self.pending), self._failed)

    def _update_overall_progress(self) -> None:
        relevant_items = [item for item in self.items.values() if item.status != QueueItemStatus.CANCELED]
        total = len(relevant_items)
        if total == 0:
            self.overall_progress_changed.emit(0.0)
            return

        done = 0.0
        for item in relevant_items:
            if item.status in {QueueItemStatus.COMPLETED, QueueItemStatus.FAILED}:
                done += 1.0
            elif item.status == QueueItemStatus.DOWNLOADING:
                done += max(0.0, min(100.0, item.progress_percent)) / 100.0
        self.overall_progress_changed.emit((done / total) * 100.0)

    @staticmethod
    def infer_filename(url: str) -> str | None:
        parsed = urlparse(url)
        path = (parsed.path or "").rstrip("/")
        if not path:
            return None

        segment = path.rsplit("/", 1)[-1]
        candidate = unquote(segment).replace("\\", "/")
        name = candidate.rsplit("/", 1)[-1].strip()
        if not name or name in {".", ".."}:
            return None
        return name

    @staticmethod
    def build_command_args(item: QueueItem, options: DownloadOptions) -> list[str]:
        args: list[str] = [
            "-d",
            options.destination,
            "-x",
            str(options.connections),
            "-s",
            str(options.splits),
            "-k",
            options.chunk_size,
            "--header",
            f"User-Agent: {options.user_agent or 'Mozilla/5.0'}",
        ]

        if options.token.strip():
            args.extend(["--header", f"Authorization: Bearer {options.token.strip()}"])

        for header in options.custom_headers:
            if header.strip():
                args.extend(["--header", header.strip()])

        if options.username.strip():
            args.extend(["--http-user", options.username.strip()])
        if options.password:
            args.extend(["--http-passwd", options.password])

        if options.continue_download:
            args.append("-c")

        override_name = item.filename_override.strip() if item.filename_override else ""
        output_name = override_name or Aria2Service.infer_filename(item.url)
        if output_name:
            args.extend(["-o", output_name])

        args.append(item.url)
        return args

    def _build_error_message(self, exit_code: int, stderr_lines: list[str]) -> str:
        stderr_text = " | ".join(line for line in stderr_lines if line)
        hint = self.build_failure_hint(exit_code, stderr_text)

        detail = ""
        for line in reversed(stderr_lines):
            if line.strip():
                detail = line.strip()
                break

        if not detail:
            return hint
        compact = self._trim_detail(detail)
        return f"{hint} Details: {compact}"

    @staticmethod
    def build_failure_hint(exit_code: int, stderr_text: str) -> str:
        hint = Aria2Service._classify_error_hint(stderr_text)
        if hint:
            return hint
        return (
            f"Download failed (aria2 exit code {exit_code}). "
            "Check URL, authentication, destination permissions, disk space, and network, then retry."
        )

    @staticmethod
    def _classify_error_hint(stderr_text: str) -> str | None:
        text = stderr_text.lower()

        if any(token in text for token in [" 401", " 403", "unauthorized", "forbidden", "authorization"]):
            return "Authentication failed (401/403). Check token or username/password, then retry."
        if "404" in text or "not found" in text:
            return "Source URL not found (404). Verify the link and retry."
        if any(token in text for token in ["could not resolve", "name resolution", "no address associated", "dns"]):
            return "Host resolution failed. Check internet/DNS (or VPN/proxy settings) and retry."
        if any(token in text for token in ["timeout", "timed out", "connection reset", "network is unreachable"]):
            return "Network timeout/error. Check your connection and retry."
        if "429" in text or "too many requests" in text:
            return "Source rate limit reached (429). Wait a bit, then retry or reduce parallel downloads."
        if "503" in text or "service unavailable" in text:
            return "Source is temporarily unavailable (503). Try again later."
        if any(token in text for token in ["no space left", "disk full", "not enough space"]):
            return "Not enough disk space in destination folder."
        if any(token in text for token in ["permission denied", "access is denied", "operation not permitted"]):
            return "No permission to write into destination folder. Choose another folder or run with proper rights."
        if any(token in text for token in ["certificate", "ssl", "tls"]):
            return "TLS/SSL validation failed. Check system time, certificates, or HTTPS inspection software."

        return None

    @staticmethod
    def _trim_detail(detail: str, max_length: int = 180) -> str:
        normalized = " ".join(detail.split())
        if len(normalized) <= max_length:
            return normalized
        return f"{normalized[: max_length - 3]}..."

    @staticmethod
    def _kill_if_alive(process: QProcess) -> None:
        if process.state() != QProcess.ProcessState.NotRunning:
            process.kill()



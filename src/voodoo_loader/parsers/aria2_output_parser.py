from __future__ import annotations

import re

from voodoo_loader.models.transfer_state import TransferState

_BASE_RE = re.compile(
    r"\[#(?P<gid>[0-9a-fA-F]+)\s+"
    r"(?P<downloaded>[0-9A-Za-z\.]+(?:i?B|[KMG]i?B)?)/"
    r"(?P<total>[0-9A-Za-z\.]+(?:i?B|[KMG]i?B)?)"
    r"\((?P<percent>\d+(?:\.\d+)?)%\)"
)
_SPEED_RE = re.compile(r"\bDL:(?P<speed>[^\s\]]+)")
_ETA_RE = re.compile(r"\bETA:(?P<eta>\d+h\d+m\d+s|\d+m\d+s|\d+s)")

_UNIT_FACTORS = {
    "B": 1,
    "KiB": 1024,
    "MiB": 1024**2,
    "GiB": 1024**3,
    "TiB": 1024**4,
    "KB": 1000,
    "MB": 1000**2,
    "GB": 1000**3,
    "TB": 1000**4,
}


class Aria2OutputParser:
    def parse_line(self, line: str) -> TransferState | None:
        match = _BASE_RE.search(line)
        if not match:
            return None

        downloaded = self._parse_size(match.group("downloaded"))
        total = self._parse_size(match.group("total"))

        speed_match = _SPEED_RE.search(line)
        eta_match = _ETA_RE.search(line)
        speed = self._parse_speed(speed_match.group("speed")) if speed_match else None
        eta = self._parse_eta(eta_match.group("eta")) if eta_match else None

        remaining = None
        if downloaded is not None and total is not None:
            remaining = max(total - downloaded, 0)

        return TransferState(
            percent=float(match.group("percent")),
            downloaded_bytes=downloaded,
            total_bytes=total,
            remaining_bytes=remaining,
            speed_bps=speed,
            eta_seconds=eta,
        )

    @staticmethod
    def _parse_speed(raw: str) -> int | None:
        return Aria2OutputParser._parse_size(raw.removesuffix("/s"))

    @staticmethod
    def _parse_size(raw: str) -> int | None:
        token = raw.strip()
        size_match = re.fullmatch(r"(?P<num>\d+(?:\.\d+)?)(?P<unit>[A-Za-z]+)", token)
        if not size_match:
            return None
        number = float(size_match.group("num"))
        unit = size_match.group("unit")
        factor = _UNIT_FACTORS.get(unit)
        if factor is None:
            return None
        return int(number * factor)

    @staticmethod
    def _parse_eta(raw: str) -> int | None:
        value = raw.strip()
        parts = re.findall(r"(\d+)([hms])", value)
        if not parts:
            return None
        seconds = 0
        for amount, unit in parts:
            amount_i = int(amount)
            if unit == "h":
                seconds += amount_i * 3600
            elif unit == "m":
                seconds += amount_i * 60
            elif unit == "s":
                seconds += amount_i
        return seconds

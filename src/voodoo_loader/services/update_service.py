from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path


DEFAULT_GITHUB_REPOSITORY = os.getenv("VOODOO_LOADER_GITHUB_REPOSITORY", "german-webdev/voodoo-loader")


@dataclass(slots=True)
class UpdateRelease:
    version: str
    tag_name: str
    release_url: str
    notes: str
    asset_name: str
    asset_url: str
    checksum_url: str = ""


@dataclass(slots=True)
class UpdateCheckResult:
    current_version: str
    latest_version: str = ""
    update_available: bool = False
    release: UpdateRelease | None = None
    error: str = ""


class UpdateService:
    _SEMVER_RE = re.compile(
        r"^v?(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
        r"(?:-(?P<prerelease>[0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$"
    )

    def __init__(self, repository: str = DEFAULT_GITHUB_REPOSITORY) -> None:
        self.repository = repository.strip()

    @staticmethod
    def normalize_version(raw: str) -> str:
        return raw.strip().lstrip("vV")

    @classmethod
    def parse_semver(cls, raw: str) -> tuple[int, int, int, tuple[str | int, ...]] | None:
        normalized = cls.normalize_version(raw)
        match = cls._SEMVER_RE.match(normalized)
        if not match:
            return None

        major = int(match.group("major"))
        minor = int(match.group("minor"))
        patch = int(match.group("patch"))

        prerelease_raw = match.group("prerelease")
        prerelease: tuple[str | int, ...] = ()
        if prerelease_raw:
            parts: list[str | int] = []
            for part in prerelease_raw.split("."):
                if part.isdigit():
                    parts.append(int(part))
                else:
                    parts.append(part.lower())
            prerelease = tuple(parts)

        return (major, minor, patch, prerelease)

    @classmethod
    def _compare_prerelease(cls, left: tuple[str | int, ...], right: tuple[str | int, ...]) -> int:
        if not left and not right:
            return 0
        if not left:
            return 1
        if not right:
            return -1

        for index in range(min(len(left), len(right))):
            lpart = left[index]
            rpart = right[index]
            if lpart == rpart:
                continue

            left_is_int = isinstance(lpart, int)
            right_is_int = isinstance(rpart, int)

            if left_is_int and right_is_int:
                return 1 if int(lpart) > int(rpart) else -1
            if left_is_int and not right_is_int:
                return -1
            if not left_is_int and right_is_int:
                return 1

            lstr = str(lpart)
            rstr = str(rpart)
            if lstr > rstr:
                return 1
            return -1

        if len(left) == len(right):
            return 0
        return 1 if len(left) > len(right) else -1

    @classmethod
    def compare_versions(cls, left: str, right: str) -> int:
        lparsed = cls.parse_semver(left)
        rparsed = cls.parse_semver(right)
        if lparsed is None or rparsed is None:
            lnorm = cls.normalize_version(left)
            rnorm = cls.normalize_version(right)
            if lnorm == rnorm:
                return 0
            return 1 if lnorm > rnorm else -1

        lmajor, lminor, lpatch, lpre = lparsed
        rmajor, rminor, rpatch, rpre = rparsed

        left_core = (lmajor, lminor, lpatch)
        right_core = (rmajor, rminor, rpatch)
        if left_core != right_core:
            return 1 if left_core > right_core else -1

        return cls._compare_prerelease(lpre, rpre)

    @staticmethod
    def runtime_target() -> tuple[str, str]:
        system = platform.system().lower()
        machine = platform.machine().lower()

        if system.startswith("win"):
            target_os = "windows"
        elif system == "linux":
            target_os = "linux"
        elif system == "darwin":
            target_os = "macos"
        else:
            target_os = system

        if machine in {"x86_64", "amd64"}:
            target_arch = "x64"
        elif machine in {"x86", "i386", "i686"}:
            target_arch = "x86"
        elif machine in {"arm64", "aarch64"}:
            target_arch = "arm64"
        else:
            target_arch = machine

        return target_os, target_arch

    def _api_url(self, repository: str) -> str:
        return f"https://api.github.com/repos/{repository}/releases"

    @staticmethod
    def _request_json(url: str, timeout_sec: int) -> object:
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "VoodooLoader-UpdateChecker",
            },
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            payload = response.read().decode("utf-8", errors="replace")
        return json.loads(payload)

    @staticmethod
    def _asset_score(name: str, target_os: str, target_arch: str) -> int:
        lower_name = name.lower()
        score = 0

        if "portable" in lower_name:
            score += 20

        if target_os and target_os in lower_name:
            score += 15

        if target_os == "linux" and "ubuntu" in lower_name:
            score += 3

        arch_pattern = re.compile(rf"(^|[-_.]){re.escape(target_arch)}($|[-_.])") if target_arch else None
        if arch_pattern and arch_pattern.search(lower_name):
            score += 10
        elif target_arch and target_arch in lower_name:
            score += 8

        if target_os == "windows" and lower_name.endswith(".zip"):
            score += 5
        if target_os == "linux" and (lower_name.endswith(".tar.gz") or lower_name.endswith(".tgz")):
            score += 5

        return score

    @classmethod
    def _pick_asset_urls(
        cls,
        assets: list[dict],
        target_os: str = "",
        target_arch: str = "",
    ) -> tuple[str, str, str]:
        if not assets:
            return ("", "", "")

        candidates: list[tuple[int, str, str]] = []
        checksums: list[tuple[str, str]] = []
        fallback_name = ""
        fallback_url = ""

        for asset in assets:
            name = str(asset.get("name", "")).strip()
            url = str(asset.get("browser_download_url", "")).strip()
            if not name or not url:
                continue

            lower_name = name.lower()
            if lower_name.endswith(".sha256"):
                checksums.append((name, url))
                continue

            is_archive = lower_name.endswith(".zip") or lower_name.endswith(".tar.gz") or lower_name.endswith(".tgz")
            if not is_archive:
                continue

            if not fallback_url:
                fallback_name = name
                fallback_url = url

            candidates.append((cls._asset_score(name, target_os, target_arch), name, url))

        if not candidates:
            return ("", "", checksums[0][1] if checksums else "")

        candidates.sort(key=lambda item: item[0], reverse=True)
        _, selected_name, selected_url = candidates[0]

        checksum_url = ""
        selected_lower = selected_name.lower()
        for checksum_name, checksum_candidate_url in checksums:
            if selected_lower in checksum_name.lower():
                checksum_url = checksum_candidate_url
                break
        if not checksum_url and checksums:
            checksum_url = checksums[0][1]

        if selected_url:
            return (selected_name, selected_url, checksum_url)

        return (fallback_name, fallback_url, checksum_url)

    def check_for_updates(self, current_version: str, repository: str = "", timeout_sec: int = 10) -> UpdateCheckResult:
        current = self.normalize_version(current_version)
        repo = (repository or self.repository).strip()

        if not repo or "/" not in repo:
            return UpdateCheckResult(current_version=current, error="update_repo_not_configured")

        try:
            payload = self._request_json(self._api_url(repo), timeout_sec)
        except urllib.error.HTTPError as exc:
            if exc.code == 403:
                return UpdateCheckResult(current_version=current, error="update_http_403")
            return UpdateCheckResult(current_version=current, error=f"update_http_{exc.code}")
        except urllib.error.URLError:
            return UpdateCheckResult(current_version=current, error="update_network_error")
        except Exception:
            return UpdateCheckResult(current_version=current, error="update_parse_error")

        if not isinstance(payload, list):
            return UpdateCheckResult(current_version=current, error="update_parse_error")

        target_os, target_arch = self.runtime_target()

        best_release: UpdateRelease | None = None
        for release_raw in payload:
            if not isinstance(release_raw, dict):
                continue
            if bool(release_raw.get("draft", False)):
                continue

            tag_name = str(release_raw.get("tag_name", "")).strip()
            version = self.normalize_version(tag_name)
            if not version:
                continue

            if best_release is None or self.compare_versions(version, best_release.version) > 0:
                assets = release_raw.get("assets", [])
                if isinstance(assets, list):
                    asset_name, asset_url, checksum_url = self._pick_asset_urls(
                        assets,
                        target_os=target_os,
                        target_arch=target_arch,
                    )
                else:
                    asset_name, asset_url, checksum_url = ("", "", "")

                best_release = UpdateRelease(
                    version=version,
                    tag_name=tag_name,
                    release_url=str(release_raw.get("html_url", "")),
                    notes=str(release_raw.get("body", "")),
                    asset_name=asset_name,
                    asset_url=asset_url,
                    checksum_url=checksum_url,
                )

        if best_release is None:
            return UpdateCheckResult(current_version=current, error="update_no_release")

        update_available = self.compare_versions(best_release.version, current) > 0
        return UpdateCheckResult(
            current_version=current,
            latest_version=best_release.version,
            update_available=update_available,
            release=best_release,
        )

    @staticmethod
    def download_file(url: str, destination: Path, timeout_sec: int = 60) -> Path:
        destination.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "VoodooLoader-Updater"},
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            with destination.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 64)
                    if not chunk:
                        break
                    handle.write(chunk)
        return destination

    @staticmethod
    def _read_sha256(expected_payload: str) -> str:
        line = expected_payload.strip().splitlines()[0].strip() if expected_payload.strip() else ""
        if not line:
            return ""
        candidate = line.split()[0].strip().lower()
        if re.fullmatch(r"[a-f0-9]{64}", candidate):
            return candidate
        return ""

    @staticmethod
    def verify_sha256(path: Path, expected_hash: str) -> bool:
        expected = expected_hash.strip().lower()
        if not expected:
            return True
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        return digest.hexdigest().lower() == expected

    def fetch_expected_hash(self, checksum_url: str, timeout_sec: int = 20) -> str:
        if not checksum_url:
            return ""
        request = urllib.request.Request(
            checksum_url,
            headers={"User-Agent": "VoodooLoader-Updater"},
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            payload = response.read().decode("utf-8", errors="replace")
        return self._read_sha256(payload)

    def download_release_asset(self, release: UpdateRelease, timeout_sec: int = 120) -> tuple[Path, str]:
        if not release.asset_url:
            raise ValueError("No downloadable asset URL in release")

        temp_dir = Path(tempfile.mkdtemp(prefix="voodoo-loader-update-"))
        asset_name = release.asset_name.strip() or "update.zip"
        destination = temp_dir / asset_name

        self.download_file(release.asset_url, destination, timeout_sec=timeout_sec)
        expected_hash = self.fetch_expected_hash(release.checksum_url)
        if expected_hash and not self.verify_sha256(destination, expected_hash):
            raise ValueError("SHA256 mismatch for downloaded update")

        return destination, expected_hash

    @staticmethod
    def launch_windows_updater(zip_path: Path, install_dir: Path, exe_path: Path, parent_pid: int) -> None:
        script_path = zip_path.parent / "voodoo_loader_apply_update.ps1"
        script_path.write_text(
            "\n".join(
                [
                    "param(",
                    "  [string]$ZipPath,",
                    "  [string]$InstallDir,",
                    "  [string]$ExePath,",
                    "  [int]$ParentPid",
                    ")",
                    "$ErrorActionPreference = 'Stop'",
                    "$updaterLog = Join-Path $InstallDir 'voodoo_loader_updater.log'",
                    "function Write-Log([string]$Message) {",
                    "  $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'",
                    "  Add-Content -LiteralPath $updaterLog -Value \"[$timestamp] $Message\"",
                    "}",
                    "function Resolve-LaunchPath([string]$InstallDir, [string]$ExePath, [string]$ExtractRoot) {",
                    "  $candidates = @(",
                    "    $ExePath,",
                    "    (Join-Path $InstallDir 'VoodooLoader.exe'),",
                    "    (Join-Path $InstallDir 'VoodooLoader\\VoodooLoader.exe'),",
                    "    (Join-Path $ExtractRoot 'VoodooLoader.exe'),",
                    "    (Join-Path $ExtractRoot 'VoodooLoader\\VoodooLoader.exe')",
                    "  ) | Select-Object -Unique",
                    "  foreach ($candidate in $candidates) {",
                    "    if ($candidate -and (Test-Path -LiteralPath $candidate)) {",
                    "      return $candidate",
                    "    }",
                    "  }",
                    "  return ''",
                    "}",
                    "Write-Log 'Updater started'",
                    "try {",
                    "  for ($i = 0; $i -lt 240; $i++) {",
                    "    if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) { break }",
                    "    Start-Sleep -Milliseconds 500",
                    "  }",
                    "  if (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue) {",
                    "    Write-Log 'Parent process still active after timeout; forcing stop'",
                    "    Stop-Process -Id $ParentPid -Force -ErrorAction SilentlyContinue",
                    "    Start-Sleep -Milliseconds 500",
                    "  }",
                    "",
                    "  $extractRoot = Join-Path (Split-Path -Parent $ZipPath) 'unpacked'",
                    "  Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue",
                    "  New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null",
                    "",
                    "  Write-Log 'Expanding update archive to temporary directory'",
                    "  Expand-Archive -LiteralPath $ZipPath -DestinationPath $extractRoot -Force",
                    "",
                    "  $sourceRoot = $extractRoot",
                    "  $children = @(Get-ChildItem -LiteralPath $extractRoot -Force)",
                    "  if ($children.Count -eq 1 -and $children[0].PSIsContainer) {",
                    "    $sourceRoot = $children[0].FullName",
                    "  }",
                    "",
                    "  Write-Log ('Copying updated files from: ' + $sourceRoot)",
                    "  Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {",
                    "    Copy-Item -LiteralPath $_.FullName -Destination $InstallDir -Recurse -Force",
                    "  }",
                    "",
                    "  $launchPath = Resolve-LaunchPath -InstallDir $InstallDir -ExePath $ExePath -ExtractRoot $extractRoot",
                    "  if (-not $launchPath) {",
                    "    throw 'Updated executable path was not found after applying update'",
                    "  }",
                    "",
                    "  $workingDir = Split-Path -Parent $launchPath",
                    "  $started = $false",
                    "  for ($i = 0; $i -lt 8; $i++) {",
                    "    try {",
                    "      Start-Process -FilePath $launchPath -WorkingDirectory $workingDir",
                    "      $started = $true",
                    "      break",
                    "    } catch {",
                    "      Start-Sleep -Milliseconds 750",
                    "    }",
                    "  }",
                    "  if ($started) {",
                    "    Write-Log ('Relaunch requested successfully: ' + $launchPath)",
                    "  } else {",
                    "    Write-Log 'Relaunch request failed; user should start app manually'",
                    "  }",
                    "} catch {",
                    "  Write-Log ('Updater failed: ' + $_.Exception.Message)",
                    "} finally {",
                    "  Remove-Item -LiteralPath $ZipPath -Force -ErrorAction SilentlyContinue",
                    "  Remove-Item -LiteralPath (Join-Path (Split-Path -Parent $ZipPath) 'unpacked') -Recurse -Force -ErrorAction SilentlyContinue",
                    "  Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force -ErrorAction SilentlyContinue",
                    "}",
                ]
            ),
            encoding="utf-8",
        )

        create_new_process_group = int(getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200))
        detached_process = int(getattr(subprocess, "DETACHED_PROCESS", 0x00000008))
        creation_flags = create_new_process_group | detached_process

        subprocess.Popen(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-WindowStyle",
                "Hidden",
                "-File",
                str(script_path),
                "-ZipPath",
                str(zip_path),
                "-InstallDir",
                str(install_dir),
                "-ExePath",
                str(exe_path),
                "-ParentPid",
                str(parent_pid),
            ],
            creationflags=creation_flags,
            close_fds=True,
            cwd=str(install_dir),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )





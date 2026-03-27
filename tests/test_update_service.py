from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import voodoo_loader.services.update_service as update_module
from voodoo_loader.services.update_service import UpdateService


def test_compare_versions_handles_prerelease_order() -> None:
    assert UpdateService.compare_versions("0.1.0", "0.1.0-alpha") == 1
    assert UpdateService.compare_versions("0.1.0-alpha.2", "0.1.0-alpha.1") == 1
    assert UpdateService.compare_versions("0.1.0-alpha", "0.1.0-alpha") == 0


def test_check_for_updates_requires_repository() -> None:
    service = UpdateService(repository="")

    result = service.check_for_updates(current_version="0.1.0")

    assert result.error == "update_repo_not_configured"
    assert result.update_available is False


def test_check_for_updates_picks_latest_release(monkeypatch) -> None:
    service = UpdateService(repository="owner/repo")

    payload = [
        {
            "tag_name": "v0.1.0-alpha",
            "html_url": "https://example.com/r1",
            "body": "alpha",
            "draft": False,
            "assets": [
                {
                    "name": "VoodooLoader-v0.1.0-alpha-windows-x64-portable.zip",
                    "browser_download_url": "https://example.com/portable-alpha.zip",
                }
            ],
        },
        {
            "tag_name": "v0.2.0",
            "html_url": "https://example.com/r2",
            "body": "stable",
            "draft": False,
            "assets": [
                {
                    "name": "VoodooLoader-v0.2.0-windows-x64-portable.zip",
                    "browser_download_url": "https://example.com/portable-stable.zip",
                }
            ],
        },
    ]

    monkeypatch.setattr(UpdateService, "_request_json", staticmethod(lambda _url, _timeout: payload))
    monkeypatch.setattr(UpdateService, "runtime_target", staticmethod(lambda: ("windows", "x64")))

    result = service.check_for_updates(current_version="0.1.0", repository="owner/repo")

    assert result.error == ""
    assert result.update_available is True
    assert result.latest_version == "0.2.0"
    assert result.release is not None
    assert result.release.asset_url == "https://example.com/portable-stable.zip"


def test_check_for_updates_reports_no_update_when_current_latest(monkeypatch) -> None:
    service = UpdateService(repository="owner/repo")

    payload = [
        {
            "tag_name": "v0.1.0",
            "html_url": "https://example.com/r1",
            "body": "notes",
            "draft": False,
            "assets": [],
        }
    ]

    monkeypatch.setattr(UpdateService, "_request_json", staticmethod(lambda _url, _timeout: payload))

    result = service.check_for_updates(current_version="0.1.0", repository="owner/repo")

    assert result.error == ""
    assert result.update_available is False
    assert result.latest_version == "0.1.0"


def test_pick_asset_prefers_platform_and_arch() -> None:
    assets = [
        {
            "name": "VoodooLoader-v0.2.0-linux-ubuntu-22.04-x64-portable.tar.gz",
            "browser_download_url": "https://example.com/linux.tar.gz",
        },
        {
            "name": "VoodooLoader-v0.2.0-windows-x64-portable.zip",
            "browser_download_url": "https://example.com/windows.zip",
        },
    ]

    name, url, checksum = UpdateService._pick_asset_urls(assets, target_os="windows", target_arch="x64")

    assert name.endswith("windows-x64-portable.zip")
    assert url == "https://example.com/windows.zip"
    assert checksum == ""


def test_pick_asset_prefers_linux_tarball_for_linux_target() -> None:
    assets = [
        {
            "name": "VoodooLoader-v0.2.0-linux-ubuntu-22.04-x64-portable.tar.gz",
            "browser_download_url": "https://example.com/linux.tar.gz",
        },
        {
            "name": "VoodooLoader-v0.2.0-windows-x64-portable.zip",
            "browser_download_url": "https://example.com/windows.zip",
        },
    ]

    name, url, _checksum = UpdateService._pick_asset_urls(assets, target_os="linux", target_arch="x64")

    assert name.endswith("linux-ubuntu-22.04-x64-portable.tar.gz")
    assert url == "https://example.com/linux.tar.gz"


def test_default_repository_is_configured() -> None:
    service = UpdateService()
    assert service.repository.strip() != ""
    assert "/" in service.repository


def test_launch_windows_updater_generates_relaunch_script(monkeypatch) -> None:
    zip_path = Path("C:/temp/update.zip")
    install_dir = Path("C:/temp/portable")
    exe_path = install_dir / "VoodooLoader.exe"

    written: dict[str, object] = {}

    def fake_write_text(self: Path, text: str, encoding: str = "utf-8") -> int:
        written["path"] = self
        written["text"] = text
        written["encoding"] = encoding
        return len(text)

    captured: dict[str, object] = {}

    def fake_popen(command, **kwargs):
        captured["command"] = command
        captured["kwargs"] = kwargs
        return SimpleNamespace()

    monkeypatch.setattr(Path, "write_text", fake_write_text)
    monkeypatch.setattr(update_module.subprocess, "Popen", fake_popen)

    UpdateService.launch_windows_updater(
        zip_path=zip_path,
        install_dir=install_dir,
        exe_path=exe_path,
        parent_pid=12345,
    )

    assert written.get("path") == zip_path.parent / "voodoo_loader_apply_update.ps1"
    script_text = str(written.get("text", ""))
    assert "Start-Process -FilePath $launchPath -WorkingDirectory $workingDir" in script_text
    assert "Write-Log 'Updater started'" in script_text
    assert "Resolve-LaunchPath" in script_text
    assert "robocopy.exe" in script_text
    assert "Robocopy failed with exit code" in script_text
    assert "Write-Log ('Updater failed: ' + $_.Exception.Message)" in script_text

    kwargs = captured.get("kwargs")
    assert isinstance(kwargs, dict)
    assert kwargs.get("cwd") == str(install_dir)
    assert int(kwargs.get("creationflags", 0)) > 0
from __future__ import annotations

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
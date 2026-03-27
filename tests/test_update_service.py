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
                    "name": "VoodooLoader-portable.zip",
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
                    "name": "VoodooLoader-portable.zip",
                    "browser_download_url": "https://example.com/portable-stable.zip",
                }
            ],
        },
    ]

    monkeypatch.setattr(UpdateService, "_request_json", staticmethod(lambda _url, _timeout: payload))

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


def test_pick_asset_prefers_portable_zip() -> None:
    assets = [
        {
            "name": "VoodooLoader.zip",
            "browser_download_url": "https://example.com/default.zip",
        },
        {
            "name": "VoodooLoader-portable.zip",
            "browser_download_url": "https://example.com/portable.zip",
        },
    ]

    name, url, checksum = UpdateService._pick_asset_urls(assets)

    assert name == "VoodooLoader-portable.zip"
    assert url == "https://example.com/portable.zip"
    assert checksum == ""

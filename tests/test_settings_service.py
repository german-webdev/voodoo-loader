from pathlib import Path
from uuid import uuid4

from voodoo_loader.models.app_settings import AppSettings
from voodoo_loader.services.settings_service import SettingsService


def _workspace_temp_dir() -> Path:
    path = Path("F:/AI/p-m/hf_aria2_downloader_gui/.tmp") / f"settings-{uuid4().hex[:8]}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def test_settings_roundtrip() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"

    settings = AppSettings(
        max_concurrent_downloads=0,
        recent_folders=["C:/data"],
        user_agent="UA",
        auto_bootstrap_aria2=False,
        aria2_custom_path="C:/tools/aria2c.exe",
        window_geometry_b64="QUJD",
        queue_column_widths=[40, 120, 200],
        auth_section_expanded=True,
        auth_mode="token",
        save_token=True,
        saved_token="secret",
        save_credentials=True,
        saved_username="user",
    )
    service.save(settings)

    loaded = service.load()

    assert loaded.max_concurrent_downloads == 0
    assert loaded.recent_folders == ["C:/data"]
    assert loaded.user_agent == "UA"
    assert loaded.auto_bootstrap_aria2 is False
    assert loaded.aria2_custom_path == "C:/tools/aria2c.exe"
    assert loaded.window_geometry_b64 == "QUJD"
    assert loaded.queue_column_widths == [40, 120, 200]
    assert loaded.auth_section_expanded is True
    assert loaded.auth_mode == "token"
    assert loaded.save_token is True
    assert loaded.saved_token == "secret"
    assert loaded.save_credentials is True
    assert loaded.saved_username == "user"


def test_settings_clamps_concurrency() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"
    service.path.write_text('{"max_concurrent_downloads": 999}', encoding="utf-8")

    loaded = service.load()

    assert loaded.max_concurrent_downloads == 32


def test_settings_allows_unlimited_concurrency_zero() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"
    service.path.write_text('{"max_concurrent_downloads": 0}', encoding="utf-8")

    loaded = service.load()

    assert loaded.max_concurrent_downloads == 0


def test_settings_persisted_queue_roundtrip() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"

    settings = AppSettings(
        persisted_queue=[
            {"url": "https://example.com/a.bin", "destination": "C:/downloads", "filename_override": ""}
        ]
    )
    service.save(settings)

    loaded = service.load()

    assert len(loaded.persisted_queue) == 1
    assert loaded.persisted_queue[0]["url"] == "https://example.com/a.bin"


def test_settings_filters_invalid_column_widths() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"
    service.path.write_text('{"queue_column_widths": [100, 0, -1, "x", 250]}', encoding="utf-8")

    loaded = service.load()

    assert loaded.queue_column_widths == [100, 250]


def test_settings_derive_auth_mode_from_legacy_saved_token() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"
    service.path.write_text('{"saved_token": "abc"}', encoding="utf-8")

    loaded = service.load()

    assert loaded.auth_mode == "token"


def test_settings_derive_auth_mode_from_legacy_saved_username() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"
    service.path.write_text('{"saved_username": "user"}', encoding="utf-8")

    loaded = service.load()

    assert loaded.auth_mode == "basic"


def test_settings_do_not_persist_auth_values_when_opt_out() -> None:
    work_dir = _workspace_temp_dir()
    service = SettingsService()
    service.path = work_dir / "settings.json"

    service.save(
        AppSettings(
            save_token=False,
            saved_token="secret",
            save_credentials=False,
            saved_username="user",
        )
    )

    loaded = service.load()

    assert loaded.save_token is False
    assert loaded.saved_token == ""
    assert loaded.save_credentials is False
    assert loaded.saved_username == ""


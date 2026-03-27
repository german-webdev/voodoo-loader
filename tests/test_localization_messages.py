from voodoo_loader.services.localization_service import LocalizationService


def test_bulk_operation_messages_exist_in_en_and_ru() -> None:
    service = LocalizationService()
    keys = [
        "retry_selected_none",
        "retry_selected_done",
        "retry_all_none",
        "retry_all_done",
        "remove_selected_none",
        "remove_selected_done",
        "remove_failed_none",
        "remove_failed_done",
        "filename_placeholder",
        "filename_ignored_multi",
        "auth_group_title",
        "auth_mode_label",
        "auth_mode_none",
        "auth_mode_token",
        "auth_mode_basic",
        "auth_bearer_label",
        "auth_show_token",
        "auth_show_password",
        "auth_remember_token",
        "auth_remember_username",
        "auth_username_label",
        "auth_password_label",
        "auth_headers_label",
        "auth_headers_placeholder",
        "auth_mode_help_none",
        "auth_mode_help_token",
        "auth_mode_help_basic",
        "auth_validation_title",
        "auth_validation_token_or_header_required",
        "auth_validation_username_required",
        "auth_validation_password_required",
        "menu_help",
        "menu_help_check_updates",
        "menu_help_about",
        "about_title",
        "update_title",
        "update_checking",
        "update_latest_message",
        "update_available_message",
        "update_repo_not_configured",
        "update_apply_platform_unsupported",
    ]

    for language in ("en", "ru"):
        for key in keys:
            rendered = service.t(key, language, count=3, version="0.1.0", current="0.1.0", latest="0.2.0")
            assert rendered != key
            assert rendered.strip()
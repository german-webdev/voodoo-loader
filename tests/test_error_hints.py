from voodoo_loader.services.aria2_service import Aria2Service


def test_build_failure_hint_authentication() -> None:
    text = "HTTP response=403 Forbidden"

    hint = Aria2Service.build_failure_hint(22, text)

    assert "Authentication failed" in hint


def test_build_failure_hint_not_found() -> None:
    text = "errorCode=3 Resource not found"

    hint = Aria2Service.build_failure_hint(3, text)

    assert "404" in hint


def test_build_failure_hint_dns() -> None:
    text = "Could not resolve host name"

    hint = Aria2Service.build_failure_hint(1, text)

    assert "Host resolution failed" in hint


def test_build_failure_hint_default_contains_exit_code() -> None:
    text = "unexpected failure"

    hint = Aria2Service.build_failure_hint(9, text)

    assert "exit code 9" in hint

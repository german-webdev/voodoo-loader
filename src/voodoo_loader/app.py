from __future__ import annotations

from PySide6.QtWidgets import QApplication


def create_app(argv: list[str]) -> QApplication:
    app = QApplication(argv)
    app.setApplicationName("Voodoo Loader")
    app.setOrganizationName("Voodoo Loader")
    return app

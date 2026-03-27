from __future__ import annotations

from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPlainTextEdit,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)


AUTH_MODE_NONE = "none"
AUTH_MODE_TOKEN = "token"
AUTH_MODE_BASIC = "basic"


class SettingsDialog(QDialog):
    def __init__(
        self,
        *,
        max_concurrent: int,
        auto_bootstrap_aria2: bool,
        aria2_custom_path: str,
        preset_name: str,
        connections: int,
        splits: int,
        chunk_size: str,
        continue_download: bool,
        user_agent: str,
        auth_mode: str,
        token: str,
        save_token: bool,
        username: str,
        save_credentials: bool,
        password: str,
        custom_headers: list[str],
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.setWindowTitle("Settings")
        self.setModal(True)
        self.resize(640, 720)

        root = QVBoxLayout(self)

        # Performance
        perf_box = QGroupBox("Speed presets / aria2", self)
        perf_form = QFormLayout(perf_box)

        self.preset_combo = QComboBox(self)
        self.preset_combo.addItems(["Safe", "Balanced", "Fast", "Aggressive", "Very large files", "Manual"])
        idx = self.preset_combo.findText(preset_name)
        self.preset_combo.setCurrentIndex(0 if idx < 0 else idx)

        self.connections_spin = QSpinBox(self)
        self.connections_spin.setRange(1, 128)
        self.connections_spin.setValue(int(connections))

        self.splits_spin = QSpinBox(self)
        self.splits_spin.setRange(1, 128)
        self.splits_spin.setValue(int(splits))

        self.chunk_input = QLineEdit(self)
        self.chunk_input.setText(chunk_size or "1M")

        self.resume_checkbox = QCheckBox("Enable continue/resume (-c)", self)
        self.resume_checkbox.setChecked(continue_download)
        self.resume_hint = QLabel(
            "If enabled, aria2 continues partial downloads instead of restarting from zero when possible.",
            self,
        )
        self.resume_hint.setWordWrap(True)

        self.user_agent_input = QLineEdit(self)
        self.user_agent_input.setText(user_agent or "Mozilla/5.0")

        perf_form.addRow("Preset", self.preset_combo)
        perf_form.addRow("Connections (-x)", self.connections_spin)
        perf_form.addRow("Splits (-s)", self.splits_spin)
        perf_form.addRow("Chunk size (-k)", self.chunk_input)
        perf_form.addRow("", self.resume_checkbox)
        perf_form.addRow("", self.resume_hint)
        perf_form.addRow("User-Agent", self.user_agent_input)

        root.addWidget(perf_box)

        # Queue execution
        queue_box = QGroupBox("Queue", self)
        queue_form = QFormLayout(queue_box)

        self.max_concurrent_spin = QSpinBox(self)
        self.max_concurrent_spin.setRange(0, 32)
        self.max_concurrent_spin.setValue(max_concurrent)
        self.max_concurrent_spin.setToolTip("0 = unlimited")

        queue_form.addRow("Max simultaneous downloads (0 = unlimited)", self.max_concurrent_spin)
        root.addWidget(queue_box)

        # Provisioning
        provision_box = QGroupBox("aria2 provisioning", self)
        provision_form = QFormLayout(provision_box)

        self.auto_bootstrap_checkbox = QCheckBox("Auto-download aria2 if missing", self)
        self.auto_bootstrap_checkbox.setChecked(auto_bootstrap_aria2)

        self.aria2_path_input = QLineEdit(self)
        self.aria2_path_input.setPlaceholderText("Optional custom path to aria2c.exe")
        self.aria2_path_input.setText(aria2_custom_path)
        browse_button = QPushButton("Browse", self)
        browse_button.clicked.connect(self._browse_aria2)

        path_row = QHBoxLayout()
        path_row.addWidget(self.aria2_path_input, 1)
        path_row.addWidget(browse_button)

        path_widget = QWidget(self)
        path_widget.setLayout(path_row)

        provision_form.addRow("", self.auto_bootstrap_checkbox)
        provision_form.addRow("Custom aria2 path", path_widget)
        root.addWidget(provision_box)

        # Authentication
        auth_box = QGroupBox("Authentication", self)
        auth_form = QFormLayout(auth_box)

        self.auth_mode_combo = QComboBox(self)
        self.auth_mode_combo.addItem("No auth", AUTH_MODE_NONE)
        self.auth_mode_combo.addItem("Token + headers", AUTH_MODE_TOKEN)
        self.auth_mode_combo.addItem("Login/password", AUTH_MODE_BASIC)
        auth_mode_index = self.auth_mode_combo.findData(auth_mode)
        self.auth_mode_combo.setCurrentIndex(0 if auth_mode_index < 0 else auth_mode_index)

        self.token_input = QLineEdit(self)
        self.token_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.token_input.setText(token)
        self.show_token_checkbox = QCheckBox("Show token", self)
        self.remember_token_checkbox = QCheckBox("Remember token", self)
        self.remember_token_checkbox.setChecked(save_token)

        self.username_input = QLineEdit(self)
        self.username_input.setText(username)
        self.remember_username_checkbox = QCheckBox("Remember username", self)
        self.remember_username_checkbox.setChecked(save_credentials)

        self.password_input = QLineEdit(self)
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.password_input.setText(password)
        self.show_password_checkbox = QCheckBox("Show password", self)

        self.headers_input = QPlainTextEdit(self)
        self.headers_input.setPlaceholderText("Custom headers, one per line")
        self.headers_input.setPlainText("\n".join(custom_headers))
        self.headers_input.setFixedHeight(80)

        self.auth_hint = QLabel("", self)
        self.auth_hint.setWordWrap(True)

        auth_form.addRow("Auth mode", self.auth_mode_combo)
        auth_form.addRow("", self.auth_hint)
        auth_form.addRow("Token", self.token_input)
        auth_form.addRow("", self.show_token_checkbox)
        auth_form.addRow("", self.remember_token_checkbox)
        auth_form.addRow("Username", self.username_input)
        auth_form.addRow("", self.remember_username_checkbox)
        auth_form.addRow("Password", self.password_input)
        auth_form.addRow("", self.show_password_checkbox)
        auth_form.addRow("Headers", self.headers_input)

        root.addWidget(auth_box)

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        root.addWidget(buttons)

        self.preset_combo.currentTextChanged.connect(self._on_preset_changed)
        self.auth_mode_combo.currentIndexChanged.connect(self._on_auth_mode_changed)
        self.show_token_checkbox.toggled.connect(self._toggle_token_visibility)
        self.show_password_checkbox.toggled.connect(self._toggle_password_visibility)

        self._on_preset_changed(self.preset_combo.currentText())
        self._on_auth_mode_changed(self.auth_mode_combo.currentIndex())

    def _browse_aria2(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Select aria2c", self.aria2_path_input.text(), "Executable (*.exe)")
        if path:
            self.aria2_path_input.setText(path)

    def _on_preset_changed(self, preset_name: str) -> None:
        presets: dict[str, tuple[int, int, str]] = {
            "Safe": (4, 4, "1M"),
            "Balanced": (16, 16, "1M"),
            "Fast": (24, 24, "1M"),
            "Aggressive": (32, 32, "1M"),
            "Very large files": (16, 16, "4M"),
            "Manual": (16, 16, "1M"),
        }
        values = presets.get(preset_name)
        if values is None:
            return
        manual = preset_name == "Manual"
        self.connections_spin.setEnabled(manual)
        self.splits_spin.setEnabled(manual)
        self.chunk_input.setEnabled(manual)

        if not manual:
            x, s, chunk = values
            self.connections_spin.setValue(x)
            self.splits_spin.setValue(s)
            self.chunk_input.setText(chunk)

    def _on_auth_mode_changed(self, _index: int) -> None:
        mode = self.auth_mode
        token_mode = mode == AUTH_MODE_TOKEN
        basic_mode = mode == AUTH_MODE_BASIC

        self.token_input.setVisible(token_mode)
        self.show_token_checkbox.setVisible(token_mode)
        self.remember_token_checkbox.setVisible(token_mode)
        self.headers_input.setVisible(token_mode)

        self.username_input.setVisible(basic_mode)
        self.remember_username_checkbox.setVisible(basic_mode)
        self.password_input.setVisible(basic_mode)
        self.show_password_checkbox.setVisible(basic_mode)

        if mode == AUTH_MODE_NONE:
            self.auth_hint.setText("Authentication is disabled.")
        elif mode == AUTH_MODE_TOKEN:
            self.auth_hint.setText("Use token and/or custom headers required by source.")
        else:
            self.auth_hint.setText("Use login/password required by source.")

    def _toggle_token_visibility(self, visible: bool) -> None:
        self.token_input.setEchoMode(QLineEdit.EchoMode.Normal if visible else QLineEdit.EchoMode.Password)

    def _toggle_password_visibility(self, visible: bool) -> None:
        self.password_input.setEchoMode(QLineEdit.EchoMode.Normal if visible else QLineEdit.EchoMode.Password)

    @property
    def max_concurrent(self) -> int:
        return int(self.max_concurrent_spin.value())

    @property
    def auto_bootstrap_aria2(self) -> bool:
        return self.auto_bootstrap_checkbox.isChecked()

    @property
    def aria2_custom_path(self) -> str:
        return self.aria2_path_input.text().strip()

    @property
    def preset_name(self) -> str:
        return self.preset_combo.currentText().strip() or "Balanced"

    @property
    def connections(self) -> int:
        return int(self.connections_spin.value())

    @property
    def splits(self) -> int:
        return int(self.splits_spin.value())

    @property
    def chunk_size(self) -> str:
        return self.chunk_input.text().strip() or "1M"

    @property
    def continue_download(self) -> bool:
        return self.resume_checkbox.isChecked()

    @property
    def user_agent(self) -> str:
        return self.user_agent_input.text().strip() or "Mozilla/5.0"

    @property
    def auth_mode(self) -> str:
        value = str(self.auth_mode_combo.currentData())
        if value not in {AUTH_MODE_NONE, AUTH_MODE_TOKEN, AUTH_MODE_BASIC}:
            return AUTH_MODE_NONE
        return value

    @property
    def token(self) -> str:
        return self.token_input.text().strip()

    @property
    def save_token(self) -> bool:
        return self.remember_token_checkbox.isChecked()

    @property
    def username(self) -> str:
        return self.username_input.text().strip()

    @property
    def save_credentials(self) -> bool:
        return self.remember_username_checkbox.isChecked()

    @property
    def password(self) -> str:
        return self.password_input.text()

    @property
    def custom_headers(self) -> list[str]:
        return [line.strip() for line in self.headers_input.toPlainText().splitlines() if line.strip()]

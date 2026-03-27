from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

from PySide6.QtCore import QByteArray, QMimeData, QUrl, Qt, Signal
from PySide6.QtGui import QAction, QBrush, QColor, QCursor, QDesktopServices, QDrag, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMenu,
    QMessageBox,
    QPlainTextEdit,
    QProgressBar,
    QPushButton,
    QProgressDialog,
    QSpinBox,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from voodoo_loader import __version__
from voodoo_loader.models.download_options import DownloadOptions
from voodoo_loader.models.queue_item import QueueItem, QueueItemPriority, QueueItemStatus
from voodoo_loader.services import (
    Aria2ProvisioningService,
    Aria2Service,
    LocalizationService,
    SettingsService,
    SoundService,
    UpdateService,
    mask_command_for_log,
)
from voodoo_loader.widgets import SettingsDialog


PRESETS: dict[str, tuple[int, int, str]] = {
    "Safe": (4, 4, "1M"),
    "Balanced": (16, 16, "1M"),
    "Fast": (24, 24, "1M"),
    "Aggressive": (32, 32, "1M"),
    "Very large files": (16, 16, "4M"),
    "Manual": (16, 16, "1M"),
}

AUTH_MODE_NONE = "none"
AUTH_MODE_TOKEN = "token"
AUTH_MODE_BASIC = "basic"
AUTH_MODES = {AUTH_MODE_NONE, AUTH_MODE_TOKEN, AUTH_MODE_BASIC}

COL_ID = 0
COL_SELECT = 1
COL_URL = 2
COL_STATUS = 3
COL_PROGRESS = 4
COL_SPEED = 5
COL_ETA = 6
COL_TOTAL_SIZE = 7
COL_PRIORITY = 8

PRIORITY_ORDER = {
    QueueItemPriority.HIGH: 0,
    QueueItemPriority.MEDIUM: 1,
    QueueItemPriority.LOW: 2,
}


class QueueTableWidget(QTableWidget):
    rows_dropped = Signal(list, int)
    DRAG_ROWS_MIME = "application/x-voodoo-loader-rows"

    @staticmethod
    def _encode_rows(rows: list[int]) -> QByteArray:
        return QByteArray(",".join(str(row) for row in rows).encode("utf-8"))

    @staticmethod
    def _decode_rows(data: QByteArray) -> list[int]:
        raw = bytes(data).decode("utf-8").strip()
        if not raw:
            return []
        rows: list[int] = []
        for part in raw.split(","):
            part = part.strip()
            if not part:
                continue
            try:
                rows.append(int(part))
            except ValueError:
                continue
        return sorted(set(rows))

    def _drag_rows(self) -> list[int]:
        rows = sorted(index.row() for index in self.selectionModel().selectedRows())
        if rows:
            return rows

        current = self.currentRow()
        if current >= 0:
            return [current]

        pos = self.viewport().mapFromGlobal(QCursor.pos())
        hovered = self.rowAt(pos.y())
        if hovered >= 0:
            return [hovered]

        return []

    def _is_internal_drag_source(self, source: object) -> bool:
        return source is self or source is self.viewport()

    def startDrag(self, _supported_actions) -> None:  # noqa: N802
        rows = self._drag_rows()
        if not rows:
            return

        mime = QMimeData()
        mime.setData(self.DRAG_ROWS_MIME, self._encode_rows(rows))

        drag = QDrag(self)
        drag.setMimeData(mime)
        drag.exec(Qt.DropAction.MoveAction)

    def dragEnterEvent(self, event) -> None:  # noqa: N802
        if self._is_internal_drag_source(event.source()) and event.mimeData().hasFormat(self.DRAG_ROWS_MIME):
            event.acceptProposedAction()
            return
        super().dragEnterEvent(event)

    def dragMoveEvent(self, event) -> None:  # noqa: N802
        if self._is_internal_drag_source(event.source()) and event.mimeData().hasFormat(self.DRAG_ROWS_MIME):
            event.acceptProposedAction()
            return
        super().dragMoveEvent(event)

    def dropEvent(self, event) -> None:  # noqa: N802
        if not self._is_internal_drag_source(event.source()) or not event.mimeData().hasFormat(self.DRAG_ROWS_MIME):
            super().dropEvent(event)
            return

        rows = self._decode_rows(event.mimeData().data(self.DRAG_ROWS_MIME))
        if not rows:
            event.ignore()
            return

        target_row = self.rowAt(event.position().toPoint().y())
        if target_row < 0:
            target_row = self.rowCount()

        self.rows_dropped.emit(rows, target_row)
        event.acceptProposedAction()



class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.settings_service = SettingsService()
        self.localization = LocalizationService()
        self.provisioning = Aria2ProvisioningService()
        self.aria2_service = Aria2Service(self)
        self.update_service = UpdateService()
        self.settings = self.settings_service.load()
        if not self.settings.update_repository.strip() and self.update_service.repository:
            self.settings.update_repository = self.update_service.repository
        if self.settings.update_repository.strip():
            self.update_service.repository = self.settings.update_repository.strip()
        if self.settings.language in frozenset({'en', 'ru'}):
            self.language = self.settings.language
        else:
            self.language = 'en'
        self.queue_items = {}
        self.queue_order = []
        self.row_for_item = {}
        self.aria2_path = None
        self._build_ui()
        self.sound_service = SoundService(self, log=self._append_log)
        self._connect_signals()
        self._install_shortcuts()
        self._apply_settings_to_ui(self.settings)
        self._restore_persisted_queue()
        self._update_transfer_metadata()
        self.setWindowTitle(self.t('app_title'))
        if not self._restore_window_geometry():
            self.resize(1200, 780)
            return None
        return None

    def t(self, key: str, **kwargs: object) -> str:
        return self.localization.t(key, self.language, **kwargs)

    def _build_ui(self):
        root = QWidget(self)
        self.setCentralWidget(root)
        layout = QVBoxLayout(root)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)
        url_row = QHBoxLayout()
        self.url_input = QLineEdit(self)
        self.url_input.setPlaceholderText('Paste direct URL here')
        self.paste_button = QPushButton('Paste', self)
        self.add_button = QPushButton('Add to queue', self)
        self.import_button = QPushButton('Import .txt', self)
        self.import_button.setVisible(False)
        url_row.addWidget(self.url_input, 1)
        url_row.addWidget(self.paste_button)
        url_row.addWidget(self.add_button)
        layout.addLayout(url_row)
        self.queue_box = QGroupBox(self.t('queue_group_title'), self)
        queue_layout = QVBoxLayout(self.queue_box)
        queue_header_row = QHBoxLayout()
        self.select_all_checkbox = QCheckBox(self.t('queue_select_all'), self)
        queue_header_row.addWidget(self.select_all_checkbox)
        queue_header_row.addStretch(1)
        queue_layout.addLayout(queue_header_row)
        self.queue_table = QueueTableWidget(self)
        self.queue_table.setColumnCount(9)
        self.queue_table.setHorizontalHeaderLabels(['ID', self.t('queue_select_col'
            ), self.t('queue_url_col'), self.t('queue_status_col'), self.t(
            'queue_progress_col'), self.t('queue_speed_col'), self.t(
            'queue_eta_col'), self.t('queue_total_size_col'), self.t(
            'queue_priority_col')])
        self.queue_table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows
            )
        self.queue_table.setSelectionMode(QTableWidget.SelectionMode.ExtendedSelection)
        self.queue_table.setEditTriggers(QTableWidget.EditTrigger.NoEditTriggers)
        self.queue_table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.queue_table.horizontalHeader().setStretchLastSection(True)
        self.queue_table.setColumnHidden(COL_ID, True)
        self.queue_table.setDragDropMode(QTableWidget.DragDropMode.DragDrop)
        self.queue_table.setDragEnabled(True)
        self.queue_table.viewport().setAcceptDrops(True)
        self.queue_table.setAcceptDrops(True)
        self.queue_table.setDropIndicatorShown(True)
        self.queue_table.setDefaultDropAction(Qt.DropAction.MoveAction)
        self.queue_table.setDragDropOverwriteMode(False)
        self.queue_table.setColumnWidth(COL_SELECT, 70)
        self.queue_table.setColumnWidth(COL_URL, 480)
        self.queue_table.setColumnWidth(COL_STATUS, 130)
        self.queue_table.setColumnWidth(COL_PROGRESS, 90)
        self.queue_table.setColumnWidth(COL_SPEED, 110)
        self.queue_table.setColumnWidth(COL_ETA, 90)
        self.queue_table.setColumnWidth(COL_TOTAL_SIZE, 120)
        self.queue_table.setColumnWidth(COL_PRIORITY, 100)
        queue_layout.addWidget(self.queue_table)
        destination_box = QGroupBox(self.t('destination_group_title'), self)
        destination_layout = QVBoxLayout(destination_box)
        destination_row = QHBoxLayout()
        self.destination_combo = QComboBox(self)
        self.destination_combo.setEditable(True)
        self.browse_button = QPushButton('Browse', self)
        destination_row.addWidget(self.destination_combo, 1)
        destination_row.addWidget(self.browse_button)
        destination_layout.addLayout(destination_row)
        self.filename_input = QLineEdit(self)
        self.filename_input.setPlaceholderText(self.t('filename_placeholder'))
        destination_layout.addWidget(self.filename_input)
        layout.addWidget(destination_box)
        self.auth_box = QGroupBox(self.t('auth_group_title'), self)
        self.auth_box.setCheckable(True)
        self.auth_box.setChecked(False)
        auth_outer_layout = QVBoxLayout(self.auth_box)
        self.auth_content = QWidget(self.auth_box)
        auth_layout = QFormLayout(self.auth_content)
        self.auth_mode_combo = QComboBox(self)
        self.auth_mode_label = QLabel(self.t('auth_mode_label'), self)
        self.auth_mode_hint_label = QLabel(self.t('auth_mode_help_none'), self)
        self.auth_mode_hint_label.setWordWrap(True)
        self.token_input = QLineEdit(self)
        self.token_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.token_label = QLabel(self.t('auth_bearer_label'), self)
        self.show_token_checkbox = QCheckBox(self.t('auth_show_token'), self)
        self.show_token_label = QLabel('', self)
        self.remember_token_checkbox = QCheckBox(self.t('auth_remember_token'), self)
        self.remember_token_label = QLabel('', self)
        self.username_input = QLineEdit(self)
        self.username_label = QLabel(self.t('auth_username_label'), self)
        self.remember_username_checkbox = QCheckBox(self.t('auth_remember_username'
            ), self)
        self.remember_username_label = QLabel('', self)
        self.password_input = QLineEdit(self)
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.password_label = QLabel(self.t('auth_password_label'), self)
        self.show_password_checkbox = QCheckBox(self.t('auth_show_password'), self)
        self.show_password_label = QLabel('', self)
        self.headers_input = QPlainTextEdit(self)
        self.headers_input.setPlaceholderText(self.t('auth_headers_placeholder'))
        self.headers_input.setFixedHeight(70)
        self.headers_label = QLabel(self.t('auth_headers_label'), self)
        auth_layout.addRow(self.auth_mode_label, self.auth_mode_combo)
        auth_layout.addRow('', self.auth_mode_hint_label)
        auth_layout.addRow(self.token_label, self.token_input)
        auth_layout.addRow(self.show_token_label, self.show_token_checkbox)
        auth_layout.addRow(self.remember_token_label, self.remember_token_checkbox)
        auth_layout.addRow(self.username_label, self.username_input)
        auth_layout.addRow(self.remember_username_label, self.
            remember_username_checkbox)
        auth_layout.addRow(self.password_label, self.password_input)
        auth_layout.addRow(self.show_password_label, self.show_password_checkbox)
        auth_layout.addRow(self.headers_label, self.headers_input)
        self._populate_auth_mode_combo(AUTH_MODE_NONE)
        self._update_auth_mode_visibility(AUTH_MODE_NONE)
        auth_outer_layout.addWidget(self.auth_content)
        self.auth_content.setVisible(False)
        self.auth_box.setVisible(False)
        params_box = QGroupBox(self.t('speed_group_title'), self)
        params_layout = QFormLayout(params_box)
        self.preset_combo = QComboBox(self)
        self.preset_combo.addItems(list(PRESETS.keys()))
        self.connections_spin = QSpinBox(params_box)
        self.connections_spin.setRange(1, 128)
        self.splits_spin = QSpinBox(params_box)
        self.splits_spin.setRange(1, 128)
        self.chunk_input = QLineEdit(params_box)
        self.user_agent_input = QLineEdit(params_box)
        self.resume_checkbox = QCheckBox(self.t('resume_label'), params_box)
        self.resume_checkbox.setToolTip(self.t('resume_hint'))
        self.settings_button = QPushButton('Settings', params_box)
        self.settings_button.setVisible(False)
        self.max_concurrent_label = QLabel(self.t('unlimited_with_zero'), params_box)
        self.speed_hint_label = QLabel(params_box)
        self.speed_hint_label.setWordWrap(True)
        self.connections_spin.setVisible(False)
        self.splits_spin.setVisible(False)
        self.chunk_input.setVisible(False)
        self.user_agent_input.setVisible(False)
        self.resume_checkbox.setVisible(False)
        self.max_concurrent_label.setVisible(False)
        params_layout.addRow(self.t('speed_preset_label'), self.preset_combo)
        params_layout.addRow('', self.speed_hint_label)
        layout.addWidget(params_box)
        progress_box = QGroupBox(self.t('progress_group_title'), self)
        progress_layout = QVBoxLayout(progress_box)
        progress_toggle_row = QHBoxLayout()
        progress_toggle_row.addStretch(1)
        self.progress_details_toggle = QPushButton(self.t('progress_more'),
            progress_box)
        self.progress_details_toggle.setCheckable(True)
        self.progress_details_toggle.setChecked(False)
        progress_toggle_row.addWidget(self.progress_details_toggle)
        progress_layout.addLayout(progress_toggle_row)
        self.global_progress = QProgressBar(progress_box)
        self.global_progress.setRange(0, 100)
        self.global_progress.setValue(0)
        progress_layout.addWidget(self.global_progress)
        self.progress_details_widget = QWidget(progress_box)
        progress_details_layout = QVBoxLayout(self.progress_details_widget)
        progress_details_layout.setContentsMargins(0, 0, 0, 0)
        progress_details_layout.setSpacing(4)
        self.status_label = QLabel(self.t('ready'), self.progress_details_widget)
        self.counts_label = QLabel('Active: 0 | Pending: 0 | Failed: 0', self.
            progress_details_widget)
        self.current_item_label = QLabel(self.progress_details_widget)
        self.current_item_label.setWordWrap(True)
        self.downloaded_total_label = QLabel(self.progress_details_widget)
        self.remaining_label = QLabel(self.progress_details_widget)
        self.speed_label = QLabel(self.progress_details_widget)
        self.eta_label = QLabel(self.progress_details_widget)
        progress_details_layout.addWidget(self.status_label)
        progress_details_layout.addWidget(self.counts_label)
        progress_details_layout.addWidget(self.current_item_label)
        progress_details_layout.addWidget(self.downloaded_total_label)
        progress_details_layout.addWidget(self.remaining_label)
        progress_details_layout.addWidget(self.speed_label)
        progress_details_layout.addWidget(self.eta_label)
        progress_layout.addWidget(self.progress_details_widget)
        layout.addWidget(progress_box)
        self._set_progress_details_expanded(False)
        control_row = QHBoxLayout()
        self.start_button = QPushButton('Start', self)
        self.stop_button = QPushButton('Stop', self)
        self.preview_button = QPushButton('Preview command', self)
        self.retry_button = QPushButton('Retry failed', self)
        self.retry_all_button = QPushButton('Retry all failed', self)
        self.move_up_button = QPushButton('Move up', self)
        self.move_down_button = QPushButton('Move down', self)
        self.move_top_button = QPushButton('Move top', self)
        self.move_bottom_button = QPushButton('Move bottom', self)
        self.remove_button = QPushButton('Remove selected', self)
        self.remove_failed_button = QPushButton('Remove failed/canceled', self)
        self.clear_queue_button = QPushButton('Clear queue', self)
        self.clear_log_button = QPushButton('Clear log', self)
        self.retry_button.setVisible(False)
        self.retry_all_button.setVisible(False)
        self.move_up_button.setVisible(False)
        self.move_down_button.setVisible(False)
        self.move_top_button.setVisible(False)
        self.move_bottom_button.setVisible(False)
        self.remove_button.setVisible(False)
        self.remove_failed_button.setVisible(False)
        self.clear_queue_button.setVisible(False)
        control_row.addWidget(self.start_button)
        control_row.addWidget(self.stop_button)
        control_row.addWidget(self.preview_button)
        control_row.addStretch(1)
        control_row.addWidget(self.clear_log_button)
        layout.addLayout(control_row)
        self.logs_box = QGroupBox('Logs', self)
        logs_layout = QVBoxLayout(self.logs_box)
        self.log_output = QPlainTextEdit(self)
        self.log_output.setReadOnly(True)
        logs_layout.addWidget(self.log_output)
        self.queue_logs_splitter = QSplitter(Qt.Orientation.Vertical, self)
        self.queue_logs_splitter.addWidget(self.queue_box)
        self.queue_logs_splitter.addWidget(self.logs_box)
        self.queue_logs_splitter.setSizes([440, 220])
        layout.addWidget(self.queue_logs_splitter, 2)
        self._build_menu()
        return None

    def _build_menu(self):
        self.menuBar().clear()
        file_menu = self.menuBar().addMenu(self.t('menu_file'))
        import_action = QAction(self.t('menu_import_txt'), self)
        import_action.triggered.connect(self._import_urls)
        file_menu.addAction(import_action)
        file_menu.addSeparator()
        exit_action = QAction(self.t('menu_exit'), self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        downloads_menu = self.menuBar().addMenu(self.t('menu_downloads'))
        start_action = QAction(self.t('action_start'), self)
        start_action.triggered.connect(self._start_queue)
        downloads_menu.addAction(start_action)
        stop_action = QAction(self.t('action_stop'), self)
        stop_action.triggered.connect(self.aria2_service.stop_all)
        downloads_menu.addAction(stop_action)
        preview_action = QAction(self.t('action_preview'), self)
        preview_action.triggered.connect(self._preview_command)
        downloads_menu.addAction(preview_action)
        downloads_menu.addSeparator()
        retry_selected_action = QAction(self.t('action_retry_selected'), self)
        retry_selected_action.triggered.connect(self._retry_failed_selected)
        downloads_menu.addAction(retry_selected_action)
        retry_all_action = QAction(self.t('action_retry_all'), self)
        retry_all_action.triggered.connect(self._retry_all_failed)
        downloads_menu.addAction(retry_all_action)
        remove_selected_action = QAction(self.t('action_remove_selected'), self)
        remove_selected_action.triggered.connect(self._remove_selected)
        downloads_menu.addAction(remove_selected_action)
        remove_failed_action = QAction(self.t('action_remove_failed'), self)
        remove_failed_action.triggered.connect(self._remove_failed_canceled)
        downloads_menu.addAction(remove_failed_action)
        clear_queue_action = QAction(self.t('action_clear_queue'), self)
        clear_queue_action.triggered.connect(self._clear_queue)
        downloads_menu.addAction(clear_queue_action)
        downloads_menu.addSeparator()
        open_file_action = QAction(self.t('action_open_file'), self)
        open_file_action.triggered.connect(self._open_selected_file)
        downloads_menu.addAction(open_file_action)
        open_folder_action = QAction(self.t('action_open_folder'), self)
        open_folder_action.triggered.connect(self._open_selected_folder)
        downloads_menu.addAction(open_folder_action)
        priority_menu = downloads_menu.addMenu(self.t('action_priority'))
        priority_high_action = QAction(self.t('priority_high'), self)
        
        
        def __temp_331():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.HIGH)
        
        
        priority_high_action.triggered.connect(__temp_331)
        priority_menu.addAction(priority_high_action)
        priority_medium_action = QAction(self.t('priority_medium'), self)
        
        
        def __temp_337():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.MEDIUM)
        
        
        priority_medium_action.triggered.connect(__temp_337)
        priority_menu.addAction(priority_medium_action)
        priority_low_action = QAction(self.t('priority_low'), self)
        
        
        def __temp_343():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.LOW)
        
        
        priority_low_action.triggered.connect(__temp_343)
        priority_menu.addAction(priority_low_action)
        view_menu = self.menuBar().addMenu(self.t('menu_view'))
        self.toggle_logs_action = QAction(self.t('view_toggle_logs'), self)
        self.toggle_logs_action.setCheckable(True)
        self.toggle_logs_action.setChecked(self.settings.show_logs)
        self.toggle_logs_action.toggled.connect(self._toggle_logs_visibility)
        view_menu.addAction(self.toggle_logs_action)
        view_menu.addSeparator()
        sort_by_date = QAction(self.t('view_sort_by_date'), self)
        sort_by_date.triggered.connect(self._sort_queue_by_date)
        view_menu.addAction(sort_by_date)
        sort_by_extension = QAction(self.t('view_sort_by_extension'), self)
        sort_by_extension.triggered.connect(self._sort_queue_by_extension)
        view_menu.addAction(sort_by_extension)
        sort_by_priority = QAction(self.t('view_sort_by_priority'), self)
        sort_by_priority.triggered.connect(self._sort_queue_by_priority)
        view_menu.addAction(sort_by_priority)
        settings_menu = self.menuBar().addMenu(self.t('menu_settings'))
        settings_action = QAction(self.t('menu_settings_open'), self)
        settings_action.triggered.connect(self.open_settings_dialog)
        settings_menu.addAction(settings_action)
        language_menu = settings_menu.addMenu(self.t('menu_language'))
        lang_en_action = QAction(self.t('lang_en'), self)
        lang_ru_action = QAction(self.t('lang_ru'), self)
        
        
        def __temp_382():
            nonlocal self
            return self._set_language('en')
        
        
        lang_en_action.triggered.connect(__temp_382)
        
        
        def __temp_385():
            nonlocal self
            return self._set_language('ru')
        
        
        lang_ru_action.triggered.connect(__temp_385)
        language_menu.addAction(lang_en_action)
        language_menu.addAction(lang_ru_action)
        help_menu = self.menuBar().addMenu(self.t('menu_help'))
        check_updates_action = QAction(self.t('menu_help_check_updates'), self)
        check_updates_action.triggered.connect(self._show_update_dialog)
        help_menu.addAction(check_updates_action)
        about_action = QAction(self.t('menu_help_about'), self)
        about_action.triggered.connect(self._show_about_dialog)
        help_menu.addAction(about_action)
        return None

    def _set_language(self, language):
        if language not in frozenset({'en', 'ru'}):
            return None
        self.language = language
        self.settings.language = language
        self.settings_service.save(self.settings)
        self._build_menu()
        self.setWindowTitle(self.t('app_title'))
        self.queue_box.setTitle(self.t('queue_group_title'))
        self.select_all_checkbox.setText(self.t('queue_select_all'))
        self.queue_table.setHorizontalHeaderLabels(['ID', self.t('queue_select_col'
            ), self.t('queue_url_col'), self.t('queue_status_col'), self.t(
            'queue_progress_col'), self.t('queue_speed_col'), self.t(
            'queue_eta_col'), self.t('queue_total_size_col'), self.t(
            'queue_priority_col')])
        self.filename_input.setPlaceholderText(self.t('filename_placeholder'))
        self.auth_box.setTitle(self.t('auth_group_title'))
        self.resume_checkbox.setText(self.t('resume_label'))
        self.resume_checkbox.setToolTip(self.t('resume_hint'))
        self.speed_hint_label.setText(self.t('speed_hint', preset=self.preset_combo
            .currentText()))
        self._refresh_progress_toggle_text()
        self._retranslate_auth_ui()
        self._update_transfer_metadata()
        self._rebuild_queue_table()
        return None

    def _connect_signals(self):
        self.paste_button.clicked.connect(self._paste_url)
        self.add_button.clicked.connect(self._add_url_from_input)
        self.import_button.clicked.connect(self._import_urls)
        self.browse_button.clicked.connect(self._browse_destination)
        self.settings_button.clicked.connect(self.open_settings_dialog)
        self.preset_combo.currentTextChanged.connect(self._apply_preset)
        self.show_token_checkbox.toggled.connect(self._toggle_token_visibility)
        self.show_password_checkbox.toggled.connect(self._toggle_password_visibility)
        self.auth_mode_combo.currentIndexChanged.connect(self._on_auth_mode_changed)
        self.auth_box.toggled.connect(self._on_auth_section_toggled)
        self.start_button.clicked.connect(self._start_queue)
        self.stop_button.clicked.connect(self.aria2_service.stop_all)
        self.preview_button.clicked.connect(self._preview_command)
        self.retry_button.clicked.connect(self._retry_failed_selected)
        self.retry_all_button.clicked.connect(self._retry_all_failed)
        self.move_up_button.clicked.connect(self._move_selected_up)
        self.move_down_button.clicked.connect(self._move_selected_down)
        self.move_top_button.clicked.connect(self._move_selected_top)
        self.move_bottom_button.clicked.connect(self._move_selected_bottom)
        self.remove_button.clicked.connect(self._remove_selected)
        self.remove_failed_button.clicked.connect(self._remove_failed_canceled)
        self.clear_queue_button.clicked.connect(self._clear_queue)
        self.clear_log_button.clicked.connect(self.log_output.clear)
        self.select_all_checkbox.toggled.connect(self._toggle_select_all)
        self.progress_details_toggle.toggled.connect(self.
            _set_progress_details_expanded)
        self.aria2_service.log_emitted.connect(self._append_log)
        self.aria2_service.item_changed.connect(self._on_item_changed)
        self.aria2_service.queue_counts_changed.connect(self._on_queue_counts_changed)
        self.aria2_service.overall_progress_changed.connect(self._on_overall_progress)
        self.aria2_service.queue_finished.connect(self._on_queue_finished)
        self.aria2_service.status_changed.connect(self.status_label.setText)
        self.queue_table.customContextMenuRequested.connect(self.
            _show_queue_context_menu)
        self.queue_table.itemChanged.connect(self._on_queue_table_item_changed)
        self.queue_table.rows_dropped.connect(self._on_queue_rows_dropped)
        return None

    def _show_queue_context_menu(self, pos):
        __temp_461, __temp_462, __temp_463 = self._selected_action_counts()
        selected_retryable = __temp_461
        _selected_queued = __temp_462
        selected_removable = __temp_463
        any_retryable = self._has_retryable_in_queue()
        has_selected = bool(self._selected_item_ids())
        menu = QMenu(self)
        retry_selected_action = menu.addAction(self.t('action_retry_selected'))
        retry_selected_action.setEnabled(selected_retryable > 0)
        retry_selected_action.triggered.connect(self._retry_failed_selected)
        retry_all_action = menu.addAction(self.t('action_retry_all'))
        retry_all_action.setEnabled(any_retryable)
        retry_all_action.triggered.connect(self._retry_all_failed)
        remove_selected_action = menu.addAction(self.t('action_remove_selected'))
        remove_selected_action.setEnabled(selected_removable > 0)
        remove_selected_action.triggered.connect(self._remove_selected)
        remove_failed_action = menu.addAction(self.t('action_remove_failed'))
        remove_failed_action.setEnabled(any_retryable)
        remove_failed_action.triggered.connect(self._remove_failed_canceled)
        clear_queue_action = menu.addAction(self.t('action_clear_queue'))
        __temp_486 = bool(self.queue_order)
        if __temp_486:
            clear_queue_action.setEnabled(not self.aria2_service.is_running)
            clear_queue_action.triggered.connect(self._clear_queue)
            menu.addSeparator()
            open_file_action = menu.addAction(self.t('action_open_file'))
        else:
            clear_queue_action.setEnabled(__temp_486)
            clear_queue_action.triggered.connect(self._clear_queue)
            menu.addSeparator()
            open_file_action = menu.addAction(self.t('action_open_file'))
        open_file_action.setEnabled(self._can_open_selected_file())
        open_file_action.triggered.connect(self._open_selected_file)
        open_folder_action = menu.addAction(self.t('action_open_folder'))
        open_folder_action.setEnabled(self._can_open_selected_folder())
        open_folder_action.triggered.connect(self._open_selected_folder)
        priority_menu = menu.addMenu(self.t('action_priority'))
        priority_high_action = priority_menu.addAction(self.t('priority_high'))
        priority_medium_action = priority_menu.addAction(self.t('priority_medium'))
        priority_low_action = priority_menu.addAction(self.t('priority_low'))
        for __temp_513 in iter((priority_high_action, priority_medium_action,
            priority_low_action)):
            action = __temp_513
            action.setEnabled(has_selected)
            continue
        
        
        def __temp_515():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.HIGH)
        
        
        priority_high_action.triggered.connect(__temp_515)
        
        
        def __temp_518():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.MEDIUM)
        
        
        priority_medium_action.triggered.connect(__temp_518)
        
        
        def __temp_521():
            nonlocal self
            return self._set_selected_priority(QueueItemPriority.LOW)
        
        
        priority_low_action.triggered.connect(__temp_521)
        menu.exec(self.queue_table.viewport().mapToGlobal(pos))
        return None

    def _selected_action_counts(self) -> tuple[int, int, int]:
        selected_ids = self._selected_item_ids()
        selected_retryable = 0
        selected_queued = 0
        selected_removable = 0

        for item_id in selected_ids:
            item = self.queue_items.get(item_id)
            if item is None:
                continue
            if self._is_retryable_status(item.status):
                selected_retryable += 1
            if item.status == QueueItemStatus.QUEUED:
                selected_queued += 1
            if item.status not in {QueueItemStatus.DOWNLOADING, QueueItemStatus.STARTING}:
                selected_removable += 1

        return selected_retryable, selected_queued, selected_removable

    def _has_retryable_in_queue(self) -> bool:
        return any(
            item and self._is_retryable_status(item.status)
            for item in (self.queue_items.get(item_id) for item_id in self.queue_order)
        )

    def _install_shortcuts(self):
        self._queue_shortcuts = []
        
        
        def bind(sequence, handler):
            nonlocal self
            shortcut = QShortcut(QKeySequence(sequence), self.queue_table)
            shortcut.setContext(Qt.ShortcutContext.WidgetWithChildrenShortcut)
            shortcut.activated.connect(handler)
            self._queue_shortcuts.append(shortcut)
            return None
        
        
        bind('Delete', self._remove_selected)
        bind('Ctrl+R', self._retry_failed_selected)
        bind('Ctrl+Shift+R', self._retry_all_failed)
        bind('Ctrl+Shift+Delete', self._remove_failed_canceled)
        return None

    def _apply_settings_to_ui(self, settings):
        self.user_agent_input.setText(settings.user_agent)
        self.resume_checkbox.setChecked(settings.continue_download)
        self.max_concurrent_label.setText(self._format_concurrency_label(settings.
            max_concurrent_downloads))
        self.connections_spin.setValue(max(1, int(settings.connections)))
        self.splits_spin.setValue(max(1, int(settings.splits)))
        if not settings.chunk_size:
            self.chunk_input.setText('1M')
        else:
            self.chunk_input.setText(settings.chunk_size)
        if settings.last_preset in PRESETS:
            self.preset_combo.setCurrentText(settings.last_preset)
            self.auth_box.setChecked(settings.auth_section_expanded)
            self._on_auth_section_toggled(settings.auth_section_expanded)
        else:
            self.preset_combo.setCurrentText('Balanced')
            self.auth_box.setChecked(settings.auth_section_expanded)
            self._on_auth_section_toggled(settings.auth_section_expanded)
        for __temp_565 in iter(settings.recent_folders):
            folder = __temp_565
            if not folder:
                continue
                __temp_566 = self.destination_combo.findText(folder)
            else:
                self.destination_combo.findText(folder)
            if not __temp_566 == -1:
                continue
                self.destination_combo.addItem(folder)
            else:
                self.destination_combo.addItem(folder)
            continue
        if self.destination_combo.count() == 0:
            self.destination_combo.addItem(str(Path.cwd()))
            self.destination_combo.setCurrentIndex(0)
            self.remember_token_checkbox.setChecked(settings.save_token)
            self.remember_username_checkbox.setChecked(settings.save_credentials)
        else:
            self.destination_combo.setCurrentIndex(0)
            self.remember_token_checkbox.setChecked(settings.save_token)
            self.remember_username_checkbox.setChecked(settings.save_credentials)
        if settings.save_token:
            self.token_input.setText(settings.saved_token)
        else:
            self.token_input.setText('')
        if settings.save_credentials:
            self.username_input.setText(settings.saved_username)
            self.headers_input.setPlainText('\n'.join(settings.auth_headers))
            self._set_auth_mode(settings.auth_mode)
            self._apply_preset(self.preset_combo.currentText())
            self._restore_queue_column_widths()
            self._toggle_logs_visibility(settings.show_logs)
            return None
        else:
            self.username_input.setText('')
            self.headers_input.setPlainText('\n'.join(settings.auth_headers))
            self._set_auth_mode(settings.auth_mode)
            self._apply_preset(self.preset_combo.currentText())
            self._restore_queue_column_widths()
            self._toggle_logs_visibility(settings.show_logs)
            return None

    def _restore_persisted_queue(self) -> None:
        restored = 0
        for persisted in self.settings.persisted_queue:
            url = persisted.get("url", "").strip()
            destination = persisted.get("destination", "").strip()
            filename_override = persisted.get("filename_override", "").strip() or None
            priority_raw = persisted.get("priority", QueueItemPriority.MEDIUM.value)
            try:
                priority = QueueItemPriority(priority_raw)
            except Exception:
                priority = QueueItemPriority.MEDIUM
            if not url or not destination:
                continue
            item = QueueItem(
                item_id=str(uuid.uuid4())[:8],
                url=url,
                destination=destination,
                filename_override=filename_override,
                priority=priority,
            )
            self.queue_items[item.item_id] = item
            self._append_or_update_row(item)
            restored += 1

        if restored > 0:
            self._append_log(f"[INFO] Restored {restored} queued item(s) from previous session")

    def _save_queue_snapshot(self) -> None:
        snapshot: list[dict[str, str]] = []
        for item_id in self.queue_order:
            item = self.queue_items.get(item_id)
            if item is None:
                continue
            if item.status in {
                QueueItemStatus.QUEUED,
                QueueItemStatus.STARTING,
                QueueItemStatus.DOWNLOADING,
                QueueItemStatus.PAUSED,
            }:
                snapshot.append(
                    {
                        "url": item.url,
                        "destination": item.destination,
                        "filename_override": item.filename_override or "",
                        "priority": item.priority.value,
                    }
                )
        self.settings.persisted_queue = snapshot
        self.settings_service.save(self.settings)

    def _apply_single_item_filename_override(self, items, log_if_ignored):
        override_name = self.filename_input.text().strip()
        if not override_name:
            return None
        if len(items) == 1:
            items[0].filename_override = override_name
            return None
        if log_if_ignored:
            self._append_log('[INFO] ' + str(self.t('filename_ignored_multi')))
            return None
        return None

    def _apply_preset(self, preset_name):
        values = PRESETS.get(preset_name)
        if not values:
            return None
        self.settings.last_preset = preset_name
        manual = preset_name == 'Manual'
        if manual:
            self.connections_spin.setEnabled(True)
            self.splits_spin.setEnabled(True)
            self.chunk_input.setEnabled(True)
            self.connections_spin.setValue(max(1, int(self.settings.connections)))
            self.splits_spin.setValue(max(1, int(self.settings.splits)))
            if not self.settings.chunk_size:
                self.chunk_input.setText('1M')
            else:
                self.chunk_input.setText(self.settings.chunk_size)
        else:
            __temp_645, __temp_646, __temp_647 = values
            x = __temp_645
            s = __temp_646
            chunk = __temp_647
            self.connections_spin.setValue(x)
            self.splits_spin.setValue(s)
            self.chunk_input.setText(chunk)
            self.connections_spin.setEnabled(False)
            self.splits_spin.setEnabled(False)
            self.chunk_input.setEnabled(False)
            self.settings.connections = x
            self.settings.splits = s
            self.settings.chunk_size = chunk
        self.speed_hint_label.setText(self.t('speed_hint', preset=preset_name))
        return None

    def _retranslate_auth_ui(self):
        current_mode = self._current_auth_mode()
        self.auth_box.setTitle(self.t('auth_group_title'))
        self.auth_mode_label.setText(self.t('auth_mode_label'))
        self.token_label.setText(self.t('auth_bearer_label'))
        self.show_token_checkbox.setText(self.t('auth_show_token'))
        self.remember_token_checkbox.setText(self.t('auth_remember_token'))
        self.username_label.setText(self.t('auth_username_label'))
        self.remember_username_checkbox.setText(self.t('auth_remember_username'))
        self.password_label.setText(self.t('auth_password_label'))
        self.show_password_checkbox.setText(self.t('auth_show_password'))
        self.headers_label.setText(self.t('auth_headers_label'))
        self.headers_input.setPlaceholderText(self.t('auth_headers_placeholder'))
        self.auth_mode_hint_label.setText(self.t(self._auth_mode_hint_key(
            current_mode)))
        self._populate_auth_mode_combo(current_mode)
        self._update_auth_mode_visibility(current_mode)
        return None

    def _populate_auth_mode_combo(self, selected_mode):
        normalized = self._normalize_auth_mode(selected_mode)
        self.auth_mode_combo.blockSignals(True)
        self.auth_mode_combo.clear()
        self.auth_mode_combo.addItem(self.t('auth_mode_none'), AUTH_MODE_NONE)
        self.auth_mode_combo.addItem(self.t('auth_mode_token'), AUTH_MODE_TOKEN)
        self.auth_mode_combo.addItem(self.t('auth_mode_basic'), AUTH_MODE_BASIC)
        index = self.auth_mode_combo.findData(normalized)
        if index < 0:
            self.auth_mode_combo.setCurrentIndex(0)
            self.auth_mode_combo.blockSignals(False)
            return None
        else:
            self.auth_mode_combo.setCurrentIndex(index)
            self.auth_mode_combo.blockSignals(False)
            return None

    @staticmethod
    def _normalize_auth_mode(mode):
        normalized = mode.strip().lower()
        if normalized in AUTH_MODES:
            return normalized
        return AUTH_MODE_NONE

    @staticmethod
    def _auth_mode_hint_key(mode):
        normalized = MainWindow._normalize_auth_mode(mode)
        if normalized == AUTH_MODE_TOKEN:
            return "auth_mode_help_token"
        if normalized == AUTH_MODE_BASIC:
            return "auth_mode_help_basic"
        return "auth_mode_help_none"

    def _current_auth_mode(self):
        __temp_701 = self.auth_mode_combo.currentData()
        if not __temp_701:
            return self._normalize_auth_mode(str(''))
        else:
            return self._normalize_auth_mode(str(__temp_701))

    def _set_auth_mode(self, mode):
        normalized = self._normalize_auth_mode(mode)
        self._populate_auth_mode_combo(normalized)
        self._update_auth_mode_visibility(normalized)
        return None

    def _on_auth_mode_changed(self, _index):
        self._update_auth_mode_visibility(self._current_auth_mode())
        return None

    def _update_auth_mode_visibility(self, mode):
        normalized = self._normalize_auth_mode(mode)
        token_visible = normalized == AUTH_MODE_TOKEN
        basic_visible = normalized == AUTH_MODE_BASIC
        self.auth_mode_hint_label.setText(self.t(self._auth_mode_hint_key(normalized)))
        for __temp_715 in iter((self.token_label, self.token_input, self.
            show_token_label, self.show_token_checkbox, self.remember_token_label,
            self.remember_token_checkbox, self.headers_label, self.headers_input)):
            widget = __temp_715
            widget.setVisible(token_visible)
            continue
        for __temp_717 in iter((self.username_label, self.username_input, self.
            remember_username_label, self.remember_username_checkbox, self.
            password_label, self.password_input, self.show_password_label, self.
            show_password_checkbox)):
            widget = __temp_717
            widget.setVisible(basic_visible)
            continue
        return None

    def _toggle_token_visibility(self, visible: bool) -> None:
        self.token_input.setEchoMode(QLineEdit.EchoMode.Normal if visible else QLineEdit.EchoMode.Password)

    def _toggle_password_visibility(self, visible: bool) -> None:
        self.password_input.setEchoMode(QLineEdit.EchoMode.Normal if visible else QLineEdit.EchoMode.Password)

    def _on_auth_section_toggled(self, expanded):
        self.auth_content.setVisible(expanded)
        return None

    def _paste_url(self):
        clipboard = QApplication.clipboard()
        if clipboard:
            text = clipboard.text().strip()
        else:
            text = ''
        if text:
            self.url_input.setText(text)
            return None
        return None

    def _add_url_from_input(self):
        raw = self.url_input.text().strip()
        if not raw:
            return None
        self._add_urls([raw])
        self.url_input.clear()
        return None

    def _add_urls(self, urls: list[str]) -> None:
        destination = self.destination_combo.currentText().strip()
        if not destination:
            QMessageBox.warning(self, self.t("queue_info"), self.t("destination_required"))
            return

        new_items: list[QueueItem] = []
        known_urls = {item.url for item in self.queue_items.values() if item.status != QueueItemStatus.CANCELED}
        for url in urls:
            cleaned = url.strip()
            if not cleaned:
                continue
            if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
                self._append_log(f"[WARN] Skipped invalid URL: {cleaned}")
                continue
            if cleaned in known_urls:
                continue

            item = QueueItem(item_id=str(uuid.uuid4())[:8], url=cleaned, destination=destination)
            self.queue_items[item.item_id] = item
            new_items.append(item)
            known_urls.add(cleaned)
            self._append_or_update_row(item)

        if not new_items:
            return

        if self.aria2_service.is_running:
            self.aria2_service.enqueue_items(new_items)
            self.status_label.setText(self.t("status_added_running"))

        self._update_transfer_metadata()
        self._save_queue_snapshot()

    def _import_urls(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "Import URLs", str(Path.cwd()), "Text files (*.txt);;All files (*)")
        if not path:
            return
        try:
            lines = Path(path).read_text(encoding="utf-8").splitlines()
        except Exception as exc:
            QMessageBox.critical(self, self.t("import_error"), str(exc))
            return
        self._add_urls(lines)

    def _browse_destination(self) -> None:
        selected = QFileDialog.getExistingDirectory(self, "Select destination", self.destination_combo.currentText())
        if not selected:
            return

        idx = self.destination_combo.findText(selected)
        if idx != -1:
            self.destination_combo.removeItem(idx)
        self.destination_combo.insertItem(0, selected)
        self.destination_combo.setCurrentIndex(0)

        self.settings.recent_folders = [selected] + [
            self.destination_combo.itemText(i)
            for i in range(1, min(self.destination_combo.count(), 15))
            if self.destination_combo.itemText(i)
        ]
        self.settings_service.save(self.settings)

    @staticmethod
    def _validate_auth_payload(
        auth_mode: str,
        token: str,
        username: str,
        password: str,
        headers: list[str],
    ) -> str | None:
        normalized = MainWindow._normalize_auth_mode(auth_mode)
        cleaned_headers = [value.strip() for value in headers if value.strip()]

        if normalized == AUTH_MODE_TOKEN and not (token.strip() or cleaned_headers):
            return "auth_validation_token_or_header_required"

        if normalized == AUTH_MODE_BASIC:
            if not username.strip():
                return "auth_validation_username_required"
            if password == "":
                return "auth_validation_password_required"

        return None

    def _ensure_auth_inputs_valid(self):
        error_key = self._validate_auth_payload(self._current_auth_mode(), self.
            token_input.text(), self.username_input.text(), self.password_input.
            text(), self.headers_input.toPlainText().splitlines())
        if error_key is None:
            return True
        QMessageBox.warning(self, self.t('auth_validation_title'), str(self.t(
            error_key)) + '\n\n' + str(self.t('auth_open_settings_hint')))
        return False

    @staticmethod
    def _resolve_auth_payload(
        auth_mode: str,
        token: str,
        username: str,
        password: str,
        headers: list[str],
    ) -> tuple[str, str, str, list[str]]:
        normalized = MainWindow._normalize_auth_mode(auth_mode)
        cleaned_headers = [value.strip() for value in headers if value.strip()]

        if normalized == AUTH_MODE_TOKEN:
            return token.strip(), "", "", cleaned_headers
        if normalized == AUTH_MODE_BASIC:
            return "", username.strip(), password, []
        return "", "", "", []

    @staticmethod
    def _compute_persisted_auth_state(
        save_token: bool,
        token: str,
        save_credentials: bool,
        username: str,
    ) -> tuple[bool, str, bool, str]:
        return (
            save_token,
            token.strip() if save_token else "",
            save_credentials,
            username.strip() if save_credentials else "",
        )

    def _build_download_options(self) -> DownloadOptions:
        headers_raw = self.headers_input.toPlainText().splitlines()
        token, username, password, auth_headers = self._resolve_auth_payload(
            self._current_auth_mode(),
            self.token_input.text(),
            self.username_input.text(),
            self.password_input.text(),
            headers_raw,
        )

        return DownloadOptions(
            destination=self.destination_combo.currentText().strip(),
            connections=max(1, int(self.settings.connections)),
            splits=max(1, int(self.settings.splits)),
            chunk_size=self.settings.chunk_size.strip() or "1M",
            user_agent=self.settings.user_agent.strip() or "Mozilla/5.0",
            continue_download=bool(self.settings.continue_download),
            token=token,
            username=username,
            password=password,
            custom_headers=auth_headers,
            max_concurrent_downloads=int(self.settings.max_concurrent_downloads),
        )

    def _start_queue(self):
        if self.aria2_service.is_running:
            self.status_label.setText(self.t('queue_already_running'))
            return None
        queued = self._ordered_items_by_status(QueueItemStatus.QUEUED)
        if not queued:
            QMessageBox.information(self, self.t('queue_info'), self.t('queue_empty'))
            return None
        destination = self.destination_combo.currentText().strip()
        if not destination:
            QMessageBox.warning(self, self.t('queue_info'), self.t(
                'destination_required'))
            return None
        Path(destination).mkdir(parents=True, exist_ok=True)
        if not self._ensure_auth_inputs_valid():
            return None
        self.aria2_path = self.provisioning.ensure_aria2_available(auto_bootstrap=
            self.settings.auto_bootstrap_aria2, preferred_path=self.settings.
            aria2_custom_path, log=self._append_log)
        if not self.aria2_path:
            if not self.settings.auto_bootstrap_aria2:
                choice = QMessageBox.question(self, self.t('aria2_not_found_title'),
                    self.t('aria2_not_found_prompt'))
                if choice == QMessageBox.StandardButton.Yes:
                    self.aria2_path = self.provisioning.ensure_aria2_available(
                        auto_bootstrap=True, preferred_path=self.settings.
                        aria2_custom_path, log=self._append_log)
        if not self.aria2_path:
            QMessageBox.critical(self, self.t('aria2_not_found_title'), self.t(
                'aria2_bootstrap_failed'))
            return None
        self._apply_single_item_filename_override(queued, log_if_ignored=True)
        options = self._build_download_options()
        self.aria2_service.set_aria2_path(self.aria2_path)
        self.aria2_service.set_download_options(options)
        self.aria2_service.enqueue_items(queued)
        self.aria2_service.reorder_pending(self.queue_order)
        self.aria2_service.start()
        self._save_runtime_settings()
        return None

    def _save_runtime_settings(self) -> None:
        self.settings.last_preset = self.preset_combo.currentText()
        self.settings.user_agent = self.user_agent_input.text().strip() or "Mozilla/5.0"
        self.settings.continue_download = self.resume_checkbox.isChecked()
        self.settings.connections = int(self.connections_spin.value())
        self.settings.splits = int(self.splits_spin.value())
        self.settings.chunk_size = self.chunk_input.text().strip() or "1M"
        self.settings.max_concurrent_downloads = max(0, min(32, int(self.settings.max_concurrent_downloads)))
        self.settings.language = self.language
        self.settings.update_repository = self.update_service.repository.strip()
        self.settings.auth_section_expanded = False
        self.settings.auth_mode = self._current_auth_mode()
        save_token, saved_token, save_credentials, saved_username = self._compute_persisted_auth_state(
            self.remember_token_checkbox.isChecked(),
            self.token_input.text(),
            self.remember_username_checkbox.isChecked(),
            self.username_input.text(),
        )
        self.settings.save_token = save_token
        self.settings.saved_token = saved_token
        self.settings.save_credentials = save_credentials
        self.settings.saved_username = saved_username
        self.settings.auth_headers = [line.strip() for line in self.headers_input.toPlainText().splitlines() if line.strip()]
        self.settings.show_logs = self.logs_box.isVisible()
        self.settings.window_geometry_b64 = bytes(self.saveGeometry().toBase64().data()).decode("ascii")
        self.settings.queue_column_widths = [
            int(self.queue_table.columnWidth(index)) for index in range(self.queue_table.columnCount())
        ]
        self.settings_service.save(self.settings)

    def _preview_command(self) -> None:
        if not self._ensure_auth_inputs_valid():
            return

        options = self._build_download_options()
        queued_items = self._ordered_items_by_status(QueueItemStatus.QUEUED)
        sample = next((item for item in queued_items), None)
        if sample is None:
            sample = next(iter(self.queue_items.values()), None)
        if sample is None:
            QMessageBox.information(self, self.t("queue_info"), self.t("cmd_preview_empty"))
            return

        original_override = sample.filename_override
        if sample.status == QueueItemStatus.QUEUED:
            self._apply_single_item_filename_override(queued_items, log_if_ignored=True)

        aria2 = self.aria2_path or "aria2c"
        args = Aria2Service.build_command_args(sample, options)
        sample.filename_override = original_override

        command_line = mask_command_for_log([aria2, *args])
        self._append_log(f"[CMD] {command_line}")

    def _retry_failed_selected(self):
        selected_ids = self._selected_item_ids()
        if not selected_ids:
            return None
        retried = self._retry_items(selected_ids)
        if retried == 0:
            self._append_log('[INFO] ' + str(self.t('retry_selected_none')))
            return None
        self._append_log('[INFO] ' + str(self.t('retry_selected_done', count=retried)))
        return None

    def _retry_all_failed(self):
        failed_ids = []
        for __temp_935 in iter(self.queue_order):
            item_id = __temp_935
            item = self.queue_items.get(item_id)
            if not item:
                continue
                __temp_937 = self._is_retryable_status(item.status)
            else:
                self._is_retryable_status(item.status)
            if not __temp_937:
                continue
                failed_ids.append(item_id)
            else:
                failed_ids.append(item_id)
            continue
        retried = self._retry_items(failed_ids)
        if retried == 0:
            self._append_log('[INFO] ' + str(self.t('retry_all_none')))
            return None
        self._append_log('[INFO] ' + str(self.t('retry_all_done', count=retried)))
        return None

    def _retry_items(self, item_ids: list[str]) -> int:
        retried: list[QueueItem] = []
        for item_id in item_ids:
            item = self.queue_items.get(item_id)
            if item is None:
                continue
            if not self._is_retryable_status(item.status):
                continue

            item.status = QueueItemStatus.QUEUED
            item.progress_percent = 0.0
            item.speed_bps = None
            item.eta_seconds = None
            item.downloaded_bytes = None
            item.total_bytes = None
            item.error_message = None
            self._append_or_update_row(item)
            retried.append(item)

        if not retried:
            return 0

        self.aria2_service.enqueue_items(retried)
        self.aria2_service.reorder_pending(self.queue_order)
        if self.aria2_service.is_running:
            self.status_label.setText(self.t("status_added_running"))
        self._update_transfer_metadata()
        self._save_queue_snapshot()
        return len(retried)

    def _move_selected_up(self):
        self._move_selected_priority(up=True)
        return None

    def _move_selected_down(self):
        self._move_selected_priority(up=False)
        return None

    def _move_selected_top(self):
        self._move_selected_edge(to_top=True)
        return None

    def _move_selected_bottom(self):
        self._move_selected_edge(to_top=False)
        return None

    def _move_selected_priority(self, *, up: bool) -> None:
        self._reorder_selected_queued("up" if up else "down")

    def _move_selected_edge(self, *, to_top: bool) -> None:
        self._reorder_selected_queued("top" if to_top else "bottom")

    def _reorder_selected_queued(self, action: str) -> bool:
        selected_ids = set(self._selected_item_ids())
        if not selected_ids:
            return False

        queued_ids = self._queued_order_ids()
        selected_queued = {item_id for item_id in queued_ids if item_id in selected_ids}
        if not selected_queued:
            self._append_log("[WARN] Priority can be changed only for queued items")
            return False

        reordered_queued = self._reorder_queued_ids(queued_ids, selected_queued, action)
        if reordered_queued == queued_ids:
            return False

        self._apply_queued_order(reordered_queued)
        self._rebuild_queue_table()
        self.aria2_service.reorder_pending(self.queue_order)
        self._select_items([item_id for item_id in reordered_queued if item_id in selected_queued])
        self._save_queue_snapshot()
        return True

    def _remove_selected(self):
        selected_ids = self._selected_item_ids()
        if not selected_ids:
            return None
        removed = self._remove_items(selected_ids)
        if removed == 0:
            self._append_log('[INFO] ' + str(self.t('remove_selected_none')))
            return None
        self._append_log('[INFO] ' + str(self.t('remove_selected_done', count=removed))
            )
        return None

    def _remove_failed_canceled(self):
        removable_ids = []
        for __temp_990 in iter(self.queue_order):
            item_id = __temp_990
            item = self.queue_items.get(item_id)
            if not item:
                continue
                __temp_992 = self._is_retryable_status(item.status)
            else:
                self._is_retryable_status(item.status)
            if not __temp_992:
                continue
                removable_ids.append(item_id)
            else:
                removable_ids.append(item_id)
            continue
        removed = self._remove_items(removable_ids)
        if removed == 0:
            self._append_log('[INFO] ' + str(self.t('remove_failed_none')))
            return None
        self._append_log('[INFO] ' + str(self.t('remove_failed_done', count=removed)))
        return None

    def _remove_items(self, item_ids: list[str]) -> int:
        if not item_ids:
            return 0

        removed = 0
        for item_id in item_ids:
            item = self.queue_items.get(item_id)
            if item is None:
                continue

            if item.status in {QueueItemStatus.DOWNLOADING, QueueItemStatus.STARTING}:
                self._append_log(f"[WARN] Cannot remove active item {item_id}")
                continue

            self.aria2_service.remove_pending_item(item_id)
            self.queue_items.pop(item_id, None)
            if item_id in self.queue_order:
                self.queue_order.remove(item_id)
                removed += 1

        if removed == 0:
            return 0

        self._rebuild_queue_table()
        self._update_transfer_metadata()
        self._save_queue_snapshot()
        return removed

    def _clear_queue(self):
        if self.aria2_service.is_running:
            QMessageBox.warning(self, self.t('queue_info'), self.t(
                'queue_already_running'))
            return None
        self.queue_items.clear()
        self.queue_order.clear()
        self.row_for_item.clear()
        self.queue_table.setRowCount(0)
        self.global_progress.setValue(0)
        self._update_transfer_metadata()
        self._save_queue_snapshot()
        return None

    def _on_item_changed(self, item_id, payload):
        item = self.queue_items.get(item_id)
        if item is None:
            item = QueueItem(item_id=item_id, url=str(payload.get('url', '')),
                destination=str(payload.get('destination', '')))
            self.queue_items[item_id] = item
        previous_status = item.status
        item.status = QueueItemStatus(str(payload.get('status', QueueItemStatus.
            QUEUED.value)))
        __temp_1034 = payload.get('progress_percent', 0.0)
        if not __temp_1034:
            item.progress_percent = float(0.0)
        else:
            item.progress_percent = float(__temp_1034)
        item.speed_bps = payload.get('speed_bps')
        item.eta_seconds = payload.get('eta_seconds')
        item.error_message = payload.get('error_message')
        item.downloaded_bytes = payload.get('downloaded_bytes')
        item.total_bytes = payload.get('total_bytes')
        if item.status != previous_status:
            if item.status == QueueItemStatus.STARTING:
                self._append_log('[AUDIO] Trigger start for ' + str(item_id))
                self.sound_service.play('start')
            elif item.status == QueueItemStatus.COMPLETED:
                self._append_log('[AUDIO] Trigger success for ' + str(item_id))
                self.sound_service.play('success')
            elif item.status == QueueItemStatus.FAILED:
                self._append_log('[AUDIO] Trigger failure for ' + str(item_id))
                self.sound_service.play('failure')
        if item.status == QueueItemStatus.FAILED:
            if previous_status != QueueItemStatus.FAILED:
                if item.error_message:
                    self._append_log('[FAIL:' + str(item_id) + '] ' + str(item.
                        error_message))
                    self._append_or_update_row(item)
                    self._update_transfer_metadata()
                    self._save_queue_snapshot()
                    return None
                else:
                    self._append_or_update_row(item)
                    self._update_transfer_metadata()
                    self._save_queue_snapshot()
                    return None
            else:
                self._append_or_update_row(item)
                self._update_transfer_metadata()
                self._save_queue_snapshot()
                return None
        else:
            self._append_or_update_row(item)
            self._update_transfer_metadata()
            self._save_queue_snapshot()
            return None

    def _queue_item_name(self, item):
        if item.filename_override:
            if item.filename_override.strip():
                return item.filename_override.strip()
        inferred = Aria2Service.infer_filename(item.url)
        if not inferred:
            return item.url
        else:
            return inferred

    def _append_or_update_row(self, item):
        row = self.row_for_item.get(item.item_id)
        if row is None:
            row = self.queue_table.rowCount()
            self.queue_table.insertRow(row)
            self.row_for_item[item.item_id] = row
            if item.item_id not in self.queue_order:
                self.queue_order.append(item.item_id)
                self.queue_table.blockSignals(True)
                self.queue_table.setItem(row, COL_ID, QTableWidgetItem(item.item_id))
                select_item = self.queue_table.item(row, COL_SELECT)
            else:
                self.queue_table.blockSignals(True)
                self.queue_table.setItem(row, COL_ID, QTableWidgetItem(item.item_id))
                select_item = self.queue_table.item(row, COL_SELECT)
        else:
            self.queue_table.blockSignals(True)
            self.queue_table.setItem(row, COL_ID, QTableWidgetItem(item.item_id))
            select_item = self.queue_table.item(row, COL_SELECT)
        if select_item is None:
            select_item = QTableWidgetItem('')
            select_item.setFlags(Qt.ItemFlag.ItemIsEnabled | Qt.ItemFlag.
                ItemIsSelectable | Qt.ItemFlag.ItemIsUserCheckable)
            self.queue_table.setItem(row, COL_SELECT, select_item)
        if item.selected:
            select_item.setCheckState(Qt.CheckState.Checked)
            name_item = QTableWidgetItem(self._queue_item_name(item))
        else:
            select_item.setCheckState(Qt.CheckState.Unchecked)
            name_item = QTableWidgetItem(self._queue_item_name(item))
        name_item.setToolTip(item.url)
        self.queue_table.setItem(row, COL_URL, name_item)
        self.queue_table.setItem(row, COL_STATUS, QTableWidgetItem(item.status.value))
        self.queue_table.setItem(row, COL_PROGRESS, QTableWidgetItem(format(item.
            progress_percent, '.1f') + '%'))
        self.queue_table.setItem(row, COL_SPEED, QTableWidgetItem(self.
            _format_speed(item.speed_bps)))
        self.queue_table.setItem(row, COL_ETA, QTableWidgetItem(self._format_eta(
            item.eta_seconds)))
        self.queue_table.setItem(row, COL_TOTAL_SIZE, QTableWidgetItem(self.
            _format_bytes(item.total_bytes)))
        self.queue_table.setItem(row, COL_PRIORITY, QTableWidgetItem(item.priority.
            value))
        palette = self.queue_table.palette()
        default_bg_color = palette.base().color()
        default_fg_color = palette.text().color()
        if item.status == QueueItemStatus.FAILED:
            row_bg_color = QColor('#ffd9d9')
        elif item.status in {QueueItemStatus.DOWNLOADING, QueueItemStatus.STARTING}:
            row_bg_color = QColor('#ffe7c2')
        elif item.status == QueueItemStatus.COMPLETED:
            row_bg_color = QColor('#d8f3d8')
        else:
            row_bg_color = default_bg_color
        if row_bg_color == default_bg_color:
            row_fg_color = default_fg_color
        elif row_bg_color.lightnessF() >= 0.6:
            row_fg_color = QColor('#1f1f1f')
        else:
            row_fg_color = QColor('#f5f5f5')
        row_brush = QBrush(row_bg_color)
        text_brush = QBrush(row_fg_color)
        for __temp_1123 in iter(range(self.queue_table.columnCount())):
            col = __temp_1123
            cell = self.queue_table.item(row, col)
            if cell is None:
                continue
                cell.setBackground(row_brush)
                cell.setForeground(text_brush)
            else:
                cell.setBackground(row_brush)
                cell.setForeground(text_brush)
            continue
        self.queue_table.blockSignals(False)
        return None

    def _rebuild_queue_table(self):
        self.row_for_item.clear()
        self.queue_table.setRowCount(0)
        for __temp_1132 in iter(self.queue_order):
            item_id = __temp_1132
            item = self.queue_items.get(item_id)
            if item is None:
                continue
                self._append_or_update_row(item)
            else:
                self._append_or_update_row(item)
            continue
        self._sync_select_all_checkbox_state()
        return None

    def _ordered_items_by_status(self, status):
        items = []
        for __temp_1138 in iter(self.queue_order):
            item_id = __temp_1138
            item = self.queue_items.get(item_id)
            if item is None:
                continue
            if not item.status == status:
                continue
                items.append(item)
            else:
                items.append(item)
            continue
        return items

    def _selected_item_ids(self) -> list[str]:
        checked_ids: list[str] = []
        for item_id in self.queue_order:
            item = self.queue_items.get(item_id)
            if item and item.selected:
                checked_ids.append(item_id)
        if checked_ids:
            return checked_ids

        rows = sorted({index.row() for index in self.queue_table.selectionModel().selectedRows()})
        item_ids: list[str] = []
        for row in rows:
            item_id_item = self.queue_table.item(row, COL_ID)
            if item_id_item is None:
                continue
            item_ids.append(item_id_item.text())
        return item_ids

    def _selected_item_id(self):
        selected = self._selected_item_ids()
        if selected:
            return selected[0]
        row = self.queue_table.currentRow()
        if row < 0:
            return None
        item_id_item = self.queue_table.item(row, COL_ID)
        if item_id_item is None:
            return None
        return item_id_item.text()

    def _queued_order_ids(self):
        queued = []
        for __temp_1165 in iter(self.queue_order):
            item_id = __temp_1165
            item = self.queue_items.get(item_id)
            if not item:
                continue
            if not item.status == QueueItemStatus.QUEUED:
                continue
                queued.append(item_id)
            else:
                queued.append(item_id)
            continue
        return queued

    def _apply_queued_order(self, reordered_queued):
        iterator = iter(reordered_queued)
        new_order = []
        for __temp_1171 in iter(self.queue_order):
            item_id = __temp_1171
            item = self.queue_items.get(item_id)
            if item:
                if item.status == QueueItemStatus.QUEUED:
                    new_order.append(next(iterator))
                    continue
                    new_order.append(item_id)
                else:
                    new_order.append(item_id)
            else:
                new_order.append(item_id)
            continue
        self.queue_order = new_order
        return None

    @staticmethod
    def _reorder_queued_ids(queued_ids: list[str], selected_ids: set[str], action: str) -> list[str]:
        reordered = list(queued_ids)

        if action == "up":
            for index in range(1, len(reordered)):
                if reordered[index] in selected_ids and reordered[index - 1] not in selected_ids:
                    reordered[index - 1], reordered[index] = reordered[index], reordered[index - 1]
            return reordered

        if action == "down":
            for index in range(len(reordered) - 2, -1, -1):
                if reordered[index] in selected_ids and reordered[index + 1] not in selected_ids:
                    reordered[index], reordered[index + 1] = reordered[index + 1], reordered[index]
            return reordered

        selected_ordered = [item_id for item_id in reordered if item_id in selected_ids]
        unselected_ordered = [item_id for item_id in reordered if item_id not in selected_ids]

        if action == "top":
            return [*selected_ordered, *unselected_ordered]
        if action == "bottom":
            return [*unselected_ordered, *selected_ordered]

        return reordered

    @staticmethod
    def _reorder_ids_by_drag_drop(current_ids: list[str], source_rows: list[int], target_row: int) -> list[str]:
        if not current_ids:
            return []

        valid_source_rows = sorted({row for row in source_rows if 0 <= row < len(current_ids)})
        if not valid_source_rows:
            return list(current_ids)

        dragged_ids = [current_ids[row] for row in valid_source_rows]
        remaining_ids = [item_id for item_id in current_ids if item_id not in dragged_ids]

        before_target = sum(1 for row in valid_source_rows if row < target_row)
        insertion_index = max(0, min(len(remaining_ids), target_row - before_target))
        return [*remaining_ids[:insertion_index], *dragged_ids, *remaining_ids[insertion_index:]]

    def _select_items(self, item_ids):
        self.queue_table.clearSelection()
        for __temp_1196 in iter(item_ids):
            item_id = __temp_1196
            row = self.row_for_item.get(item_id)
            if row is None:
                continue
                self.queue_table.selectRow(row)
            else:
                self.queue_table.selectRow(row)
            continue
        return None

    def _toggle_select_all(self, checked):
        self.queue_table.blockSignals(True)
        for __temp_1202 in iter(self.queue_items.values()):
            item = __temp_1202
            item.selected = checked
            continue
        for __temp_1205 in iter(range(self.queue_table.rowCount())):
            row = __temp_1205
            select_item = self.queue_table.item(row, COL_SELECT)
            if select_item is None:
                continue
            if checked:
                select_item.setCheckState(Qt.CheckState.Checked)
            else:
                select_item.setCheckState(Qt.CheckState.Unchecked)
            continue
        self.queue_table.blockSignals(False)
        return None

    def _sync_select_all_checkbox_state(self) -> None:
        if not self.queue_items:
            self.select_all_checkbox.blockSignals(True)
            self.select_all_checkbox.setChecked(False)
            self.select_all_checkbox.blockSignals(False)
            return

        all_selected = all(item.selected for item in self.queue_items.values())
        self.select_all_checkbox.blockSignals(True)
        self.select_all_checkbox.setChecked(all_selected)
        self.select_all_checkbox.blockSignals(False)

    def _on_queue_table_item_changed(self, table_item):
        if table_item.column() != COL_SELECT:
            return None
        row = table_item.row()
        item_id_item = self.queue_table.item(row, COL_ID)
        if item_id_item is None:
            return None
        item = self.queue_items.get(item_id_item.text())
        if item is None:
            return None
        item.selected = table_item.checkState() == Qt.CheckState.Checked
        self._sync_select_all_checkbox_state()
        return None

    def _on_queue_table_reordered(self) -> None:
        new_order: list[str] = []
        for row in range(self.queue_table.rowCount()):
            item_id_item = self.queue_table.item(row, COL_ID)
            if item_id_item is None:
                continue
            new_order.append(item_id_item.text())

        if len(new_order) != len(self.queue_order):
            return

        self.queue_order = new_order
        self.row_for_item = {item_id: idx for idx, item_id in enumerate(new_order)}
        self.aria2_service.reorder_pending(self.queue_order)
        self._save_queue_snapshot()


    def _on_queue_rows_dropped(self, source_rows: list[int], target_row: int) -> None:
        current_ids: list[str] = []
        for row in range(self.queue_table.rowCount()):
            item_id_item = self.queue_table.item(row, COL_ID)
            if item_id_item is None:
                continue
            current_ids.append(item_id_item.text())

        new_order = self._reorder_ids_by_drag_drop(current_ids, source_rows, target_row)
        if len(new_order) != len(self.queue_order):
            return
        if new_order == self.queue_order:
            return

        dragged_ids = [current_ids[row] for row in sorted({r for r in source_rows if 0 <= r < len(current_ids)})]
        self.queue_order = new_order
        self.row_for_item = {item_id: idx for idx, item_id in enumerate(new_order)}
        self._rebuild_queue_table()
        self._select_items(dragged_ids)
        self.aria2_service.reorder_pending(self.queue_order)
        self._save_queue_snapshot()

    def _toggle_logs_visibility(self, visible):
        self.logs_box.setVisible(visible)
        self.settings.show_logs = bool(visible)
        return None

    def _sort_queue_by_date(self):
        def sort_key(item_id):
            nonlocal self
            item = self.queue_items.get(item_id)
            if item is None:
                return 0.0, item_id
            return item.created_at.timestamp(), item_id
        
        
        self.queue_order.sort(key=sort_key)
        self._rebuild_queue_table()
        self.aria2_service.reorder_pending(self.queue_order)
        self._save_queue_snapshot()
        return None

    def _sort_queue_by_extension(self):
        def sort_key(item_id):
            nonlocal self
            item = self.queue_items.get(item_id)
            if item is None:
                return '', item_id
            name = self._queue_item_name(item)
            return Path(name).suffix.lower(), name.lower()
        
        
        self.queue_order.sort(key=sort_key)
        self._rebuild_queue_table()
        self.aria2_service.reorder_pending(self.queue_order)
        self._save_queue_snapshot()
        return None

    def _sort_queue_by_priority(self):
        def sort_key(item_id):
            nonlocal self
            item = self.queue_items.get(item_id)
            if item is None:
                return 1, 0.0, item_id
            return PRIORITY_ORDER.get(item.priority, 1), item.created_at.timestamp(
                ), item_id
        
        
        self.queue_order.sort(key=sort_key)
        self._rebuild_queue_table()
        self.aria2_service.reorder_pending(self.queue_order)
        self._save_queue_snapshot()
        return None

    def _set_selected_priority(self, priority):
        selected_ids = self._selected_item_ids()
        if not selected_ids:
            return None
        changed = 0
        for __temp_1268 in iter(selected_ids):
            item_id = __temp_1268
            item = self.queue_items.get(item_id)
            if item is None:
                continue
            if item.priority == priority:
                continue
                item.priority = priority
            else:
                item.priority = priority
            self._append_or_update_row(item)
            changed += 1
            continue
        if changed > 0:
            self._append_log('[INFO] ' + str(self.t('priority_updated', count=
                changed, priority=priority.value)))
            self._save_queue_snapshot()
            return None
        return None

    def _resolve_downloaded_file_path(self, item):
        file_name = self._queue_item_name(item).strip()
        if not file_name:
            return None
        return Path(item.destination) / file_name

    def _can_open_selected_file(self):
        item_id = self._selected_item_id()
        if not item_id:
            return False
        item = self.queue_items.get(item_id)
        if item is None:
            return False
        path = self._resolve_downloaded_file_path(item)
        if path:
            return bool(path.is_file())
        else:
            return bool(path)

    def _can_open_selected_folder(self):
        item_id = self._selected_item_id()
        if not item_id:
            return False
        item = self.queue_items.get(item_id)
        if item is None:
            return False
        return Path(item.destination).is_dir()

    def _open_selected_file(self):
        item_id = self._selected_item_id()
        if not item_id:
            return None
        item = self.queue_items.get(item_id)
        if item is None:
            return None
        path = self._resolve_downloaded_file_path(item)
        if path:
            if not path.is_file():
                QMessageBox.information(self, self.t('queue_info'), self.t(
                    'open_file_missing'))
                return None
        else:
            QMessageBox.information(self, self.t('queue_info'), self.t(
                'open_file_missing'))
            return None
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(path)))
        return None

    def _open_selected_folder(self):
        item_id = self._selected_item_id()
        if not item_id:
            return None
        item = self.queue_items.get(item_id)
        if item is None:
            return None
        folder = Path(item.destination)
        if not folder.is_dir():
            QMessageBox.information(self, self.t('queue_info'), self.t(
                'open_folder_missing'))
            return None
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(folder)))
        return None

    def _refresh_progress_toggle_text(self) -> None:
        self.progress_details_toggle.setText(
            self.t("progress_less") if self.progress_details_toggle.isChecked() else self.t("progress_more")
        )

    def _set_progress_details_expanded(self, expanded):
        self.progress_details_widget.setVisible(bool(expanded))
        self._refresh_progress_toggle_text()
        return None

    def _on_queue_counts_changed(self, active, pending, failed):
        self.counts_label.setText('Active: ' + str(active) + ' | Pending: ' + str(
            pending) + ' | Failed: ' + str(failed))
        self._update_transfer_metadata()
        return None

    def _on_overall_progress(self, percent):
        self.global_progress.setValue(int(percent))
        return None

    def _on_queue_finished(self, ok, failed, stopped):
        if stopped:
            self._append_log('[INFO] Queue stopped by user')
            self._update_transfer_metadata()
            self._save_queue_snapshot()
            return None
        else:
            self._append_log('[INFO] Queue finished. Successful: ' + str(ok) +
                ', failed: ' + str(failed))
            self._update_transfer_metadata()
            self._save_queue_snapshot()
            return None

    def _show_about_dialog(self) -> None:
        QMessageBox.information(self, self.t('about_title'), self.t('about_text', version=__version__))

    def _show_update_dialog(self) -> None:
        if self.aria2_service.is_running:
            QMessageBox.warning(self, self.t('update_title'), self.t('update_running_blocked'))
            return

        progress = QProgressDialog(self.t('update_checking'), '', 0, 0, self)
        progress.setWindowTitle(self.t('update_title'))
        progress.setCancelButton(None)
        progress.setWindowModality(Qt.WindowModality.ApplicationModal)
        progress.setMinimumDuration(0)
        progress.show()
        QApplication.processEvents()

        result = self.update_service.check_for_updates(
            current_version=__version__,
            repository=self.settings.update_repository,
        )
        progress.close()

        if result.error:
            QMessageBox.warning(self, self.t('update_error_title'), self.t(result.error))
            return

        if not result.update_available:
            QMessageBox.information(
                self,
                self.t('update_latest_title'),
                self.t('update_latest_message', version=result.current_version),
            )
            return

        release = result.release
        if release is None:
            QMessageBox.warning(self, self.t('update_error_title'), self.t('update_parse_error'))
            return

        dialog = QMessageBox(self)
        dialog.setWindowTitle(self.t('update_available_title'))
        dialog.setIcon(QMessageBox.Icon.Information)
        dialog.setText(self.t('update_available_message', current=result.current_version, latest=result.latest_version))
        dialog.setInformativeText(self.t('update_available_question'))

        install_button = dialog.addButton(self.t('update_button_install'), QMessageBox.ButtonRole.AcceptRole)
        cancel_button = dialog.addButton(QMessageBox.StandardButton.Cancel)
        _ = cancel_button

        open_release_button = None
        if release.release_url:
            open_release_button = dialog.addButton(self.t('update_open_release'), QMessageBox.ButtonRole.ActionRole)

        dialog.exec()
        clicked = dialog.clickedButton()

        if open_release_button is not None and clicked is open_release_button:
            QDesktopServices.openUrl(QUrl(release.release_url))
            self._append_log('[INFO] ' + str(self.t('update_release_opened')))
            return

        if clicked is install_button:
            self._download_and_apply_update(release)

    def _download_and_apply_update(self, release) -> None:
        if not getattr(sys, 'frozen', False):
            QMessageBox.information(self, self.t('update_title'), self.t('update_dev_mode'))
            if release.release_url:
                QDesktopServices.openUrl(QUrl(release.release_url))
            return

        if not release.asset_url:
            response = QMessageBox.question(
                self,
                self.t('update_title'),
                self.t('update_release_no_asset'),
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                QMessageBox.StandardButton.Yes,
            )
            if response == QMessageBox.StandardButton.Yes and release.release_url:
                QDesktopServices.openUrl(QUrl(release.release_url))
            return

        progress = QProgressDialog(self.t('update_download_started'), '', 0, 0, self)
        progress.setWindowTitle(self.t('update_title'))
        progress.setCancelButton(None)
        progress.setWindowModality(Qt.WindowModality.ApplicationModal)
        progress.setMinimumDuration(0)
        progress.show()
        QApplication.processEvents()

        try:
            package_path, _checksum = self.update_service.download_release_asset(release)
        except Exception as exc:
            progress.close()
            self._append_log('[WARN] Update download failed: ' + str(exc))
            QMessageBox.warning(self, self.t('update_title'), self.t('update_download_failed'))
            return

        progress.close()

        try:
            install_dir = Path(sys.executable).resolve().parent
            exe_path = Path(sys.executable).resolve()
            self.update_service.launch_windows_updater(
                zip_path=package_path,
                install_dir=install_dir,
                exe_path=exe_path,
                parent_pid=os.getpid(),
            )
        except Exception as exc:
            self._append_log('[WARN] Update apply failed: ' + str(exc))
            QMessageBox.warning(self, self.t('update_title'), self.t('update_prepare_failed'))
            return

        QMessageBox.information(self, self.t('update_title'), self.t('update_restart_prompt'))
        self.close()

    def _append_log(self, message):
        self.log_output.appendPlainText(message)
        return None

    def open_settings_dialog(self) -> None:
        dialog = SettingsDialog(
            max_concurrent=self.settings.max_concurrent_downloads,
            auto_bootstrap_aria2=self.settings.auto_bootstrap_aria2,
            aria2_custom_path=self.settings.aria2_custom_path,
            preset_name=self.settings.last_preset,
            connections=self.settings.connections,
            splits=self.settings.splits,
            chunk_size=self.settings.chunk_size,
            continue_download=self.settings.continue_download,
            user_agent=self.settings.user_agent,
            auth_mode=self.settings.auth_mode,
            token=self.token_input.text(),
            save_token=self.remember_token_checkbox.isChecked(),
            username=self.username_input.text(),
            save_credentials=self.remember_username_checkbox.isChecked(),
            password=self.password_input.text(),
            custom_headers=[line.strip() for line in self.headers_input.toPlainText().splitlines() if line.strip()],
            parent=self,
        )
        if dialog.exec() != dialog.DialogCode.Accepted:
            return

        self.settings.max_concurrent_downloads = dialog.max_concurrent
        self.settings.auto_bootstrap_aria2 = dialog.auto_bootstrap_aria2
        self.settings.aria2_custom_path = dialog.aria2_custom_path

        self.settings.last_preset = dialog.preset_name
        self.settings.connections = dialog.connections
        self.settings.splits = dialog.splits
        self.settings.chunk_size = dialog.chunk_size
        self.settings.continue_download = dialog.continue_download
        self.settings.user_agent = dialog.user_agent

        self.connections_spin.setValue(dialog.connections)
        self.splits_spin.setValue(dialog.splits)
        self.chunk_input.setText(dialog.chunk_size)
        self.resume_checkbox.setChecked(dialog.continue_download)
        self.user_agent_input.setText(dialog.user_agent)

        self.settings.auth_mode = dialog.auth_mode
        self._set_auth_mode(dialog.auth_mode)
        self.remember_token_checkbox.setChecked(dialog.save_token)
        self.token_input.setText(dialog.token)
        self.remember_username_checkbox.setChecked(dialog.save_credentials)
        self.username_input.setText(dialog.username)
        self.password_input.setText(dialog.password)
        self.headers_input.setPlainText("\n".join(dialog.custom_headers))

        self.max_concurrent_label.setText(self._format_concurrency_label(dialog.max_concurrent))
        self.preset_combo.setCurrentText(dialog.preset_name)
        self._apply_preset(dialog.preset_name)

        self.settings_service.save(self.settings)
        self._append_log(
            f"[INFO] {self.t('settings_saved', value=self._format_concurrency_label(dialog.max_concurrent))}"
        )

    def closeEvent(self, event):
        if self.aria2_service.is_running:
            answer = QMessageBox.question(self, self.t('exit_title'), self.t(
                'exit_running_prompt'))
            if answer != QMessageBox.StandardButton.Yes:
                event.ignore()
                return None
            self.aria2_service.stop_all()
            self._save_runtime_settings()
            self._save_queue_snapshot()
            event.accept()
            return None
        else:
            self._save_runtime_settings()
            self._save_queue_snapshot()
            event.accept()
            return None

    def _pick_focus_item(self) -> QueueItem | None:
        for status in (QueueItemStatus.DOWNLOADING, QueueItemStatus.STARTING, QueueItemStatus.PAUSED):
            for item_id in self.queue_order:
                item = self.queue_items.get(item_id)
                if item and item.status == status:
                    return item
        return None

    def _update_transfer_metadata(self):
        focus = self._pick_focus_item()
        unknown = self.t('progress_na')
        if focus is None:
            self.current_item_label.setText(self.t('progress_current_item', value=
                self.t('progress_none')))
            self.downloaded_total_label.setText(self.t('progress_downloaded_total',
                value=str(unknown) + ' / ' + str(unknown)))
            self.remaining_label.setText(self.t('progress_remaining', value=unknown))
            self.speed_label.setText(self.t('progress_speed', value=unknown))
            self.eta_label.setText(self.t('progress_eta', value=unknown))
            return None
        downloaded = self._format_bytes(focus.downloaded_bytes)
        total = self._format_bytes(focus.total_bytes)
        remaining_bytes = None
        if focus.total_bytes is not None:
            if focus.downloaded_bytes is not None:
                remaining_bytes = max(focus.total_bytes - focus.downloaded_bytes, 0)
        self.current_item_label.setText(self.t('progress_current_item', value=self.
            _shorten_url(focus.url, 96)))
        self.downloaded_total_label.setText(self.t('progress_downloaded_total',
            value=str(downloaded) + ' / ' + str(total)))
        self.remaining_label.setText(self.t('progress_remaining', value=self.
            _format_bytes(remaining_bytes)))
        self.speed_label.setText(self.t('progress_speed', value=self._format_speed(
            focus.speed_bps)))
        self.eta_label.setText(self.t('progress_eta', value=self._format_eta(focus.
            eta_seconds)))
        return None

    def _restore_window_geometry(self) -> bool:
        encoded = self.settings.window_geometry_b64.strip()
        if not encoded:
            return False

        try:
            geometry = QByteArray.fromBase64(encoded.encode("ascii"))
        except Exception:
            return False

        if geometry.isEmpty():
            return False
        return bool(self.restoreGeometry(geometry))

    def _restore_queue_column_widths(self):
        widths = self.settings.queue_column_widths
        if len(widths) != self.queue_table.columnCount():
            return None
        for __temp_1417 in iter(enumerate(widths)):
            __temp_1418, __temp_1419 = __temp_1417
            index = __temp_1418
            width = __temp_1419
            if not width > 0:
                continue
                self.queue_table.setColumnWidth(index, int(width))
            else:
                self.queue_table.setColumnWidth(index, int(width))
            continue
        return None

    def _format_concurrency_label(self, value):
        if value <= 0:
            return self.t('unlimited_with_zero')
        return str(value)

    @staticmethod
    def _is_retryable_status(status):
        return status in {QueueItemStatus.FAILED, QueueItemStatus.CANCELED}

    @staticmethod
    def _shorten_url(url, max_length):
        if len(url) <= max_length:
            return url
        return str(url[None:max_length - 3]) + '...'

    @staticmethod
    def _format_bytes(size: int | None) -> str:
        if size is None:
            return "-"
        if size >= 1024**3:
            return f"{size / 1024**3:.2f} GiB"
        if size >= 1024**2:
            return f"{size / 1024**2:.2f} MiB"
        if size >= 1024:
            return f"{size / 1024:.1f} KiB"
        return f"{size} B"

    @staticmethod
    def _format_speed(speed_bps: int | None) -> str:
        if speed_bps is None:
            return "-"
        if speed_bps >= 1024**2:
            return f"{speed_bps / 1024**2:.2f} MiB/s"
        if speed_bps >= 1024:
            return f"{speed_bps / 1024:.1f} KiB/s"
        return f"{speed_bps} B/s"

    @staticmethod
    def _format_eta(eta_seconds: int | None) -> str:
        if eta_seconds is None:
            return "-"
        m, s = divmod(eta_seconds, 60)
        h, m = divmod(m, 60)
        if h:
            return f"{h}h {m}m {s}s"
        if m:
            return f"{m}m {s}s"
        return f"{s}s"









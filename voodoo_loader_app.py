import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
from urllib.parse import urlparse, unquote


class Aria2DownloaderApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Voodoo Loader")
        self.root.geometry("900x760")
        self.root.minsize(820, 680)

        self.active_processes: dict[int, subprocess.Popen] = {}
        self.active_processes_lock = threading.Lock()
        self.download_thread: threading.Thread | None = None
        self.stop_requested = False
        self.gui_queue: queue.Queue[tuple[str, object]] = queue.Queue()
        self.progress_started = False
        self.progress_value = 0.0
        self.progress_mode = "indeterminate"
        self.queue_progress_lock = threading.Lock()
        self.queue_total_items = 0
        self.queue_completed_items = 0
        self.queue_running_progress: dict[int, float] = {}
        self.current_status = "Р“РѕС‚РѕРІРѕ"

        self.folder_var = tk.StringVar(value=os.getcwd())
        self.connections_var = tk.StringVar(value="16")
        self.splits_var = tk.StringVar(value="16")
        self.chunk_var = tk.StringVar(value="1M")
        self.preset_var = tk.StringVar(value="РЎР±Р°Р»Р°РЅСЃРёСЂРѕРІР°РЅРЅС‹Р№ (СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ)")
        self.presets = {
            "РћСЃС‚РѕСЂРѕР¶РЅС‹Р№": {"x": "4", "s": "4", "k": "1M"},
            "РЎР±Р°Р»Р°РЅСЃРёСЂРѕРІР°РЅРЅС‹Р№ (СЂРµРєРѕРјРµРЅРґСѓРµС‚СЃСЏ)": {"x": "16", "s": "16", "k": "1M"},
            "Р‘С‹СЃС‚СЂС‹Р№": {"x": "24", "s": "24", "k": "1M"},
            "РђРіСЂРµСЃСЃРёРІРЅС‹Р№": {"x": "32", "s": "32", "k": "1M"},
            "РћС‡РµРЅСЊ Р±РѕР»СЊС€РёРµ С„Р°Р№Р»С‹": {"x": "16", "s": "16", "k": "4M"},
            "Р СѓС‡РЅРѕР№": {"x": "16", "s": "16", "k": "1M"},
        }
        self.filename_var = tk.StringVar()
        self.user_agent_var = tk.StringVar(value="Mozilla/5.0")
        self.hf_token_var = tk.StringVar()
        self.continue_var = tk.BooleanVar(value=True)
        self.auto_name_var = tk.BooleanVar(value=True)
        self.show_token_var = tk.BooleanVar(value=False)
        self.max_concurrent_var = tk.IntVar(value=1)
        self.settings_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "voodoo_loader_settings.json")
        self.load_settings()

        self._build_ui()
        self._check_aria2()
        self.apply_preset(self.preset_var.get())
        self.bind_clipboard_shortcuts()
        self.root.after(100, self.process_gui_queue)

    def _build_ui(self) -> None:
        pad = {"padx": 10, "pady": 6}

        frame = tk.Frame(self.root)
        frame.pack(fill="both", expand=True)
        menubar = tk.Menu(self.root)
        app_menu = tk.Menu(menubar, tearoff=0)
        app_menu.add_command(label="Settings", command=self.open_settings_dialog)
        menubar.add_cascade(label="App", menu=app_menu)
        self.root.configure(menu=menubar)

        links_header = tk.Frame(frame)
        links_header.grid(row=0, column=0, columnspan=3, sticky="ew", padx=10, pady=(6, 0))
        tk.Label(links_header, text="РЎСЃС‹Р»РєРё РЅР° С„Р°Р№Р»С‹ (РїРѕ РѕРґРЅРѕР№ РЅР° СЃС‚СЂРѕРєСѓ)").pack(side="left")
        tk.Button(links_header, text="Р’СЃС‚Р°РІРёС‚СЊ РёР· Р±СѓС„РµСЂР°", command=self.paste_urls_from_clipboard).pack(side="right", padx=(8, 0))

        self.urls_text = scrolledtext.ScrolledText(frame, wrap="word", height=8, undo=True)
        self.urls_text.grid(row=1, column=0, columnspan=3, sticky="nsew", padx=10, pady=(0, 10))

        tk.Label(frame, text="РџР°РїРєР° Р·Р°РіСЂСѓР·РєРё").grid(row=2, column=0, sticky="w", **pad)
        tk.Entry(frame, textvariable=self.folder_var).grid(row=3, column=0, columnspan=2, sticky="ew", **pad)
        tk.Button(frame, text="Р’С‹Р±СЂР°С‚СЊ РїР°РїРєСѓ", command=self.choose_folder).grid(row=3, column=2, sticky="ew", **pad)

        tk.Label(frame, text="РРјСЏ С„Р°Р№Р»Р° РґР»СЏ РѕРґРёРЅРѕС‡РЅРѕР№ Р·Р°РіСЂСѓР·РєРё (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)").grid(row=4, column=0, sticky="w", **pad)
        self.filename_entry = tk.Entry(frame, textvariable=self.filename_var)
        self.filename_entry.grid(row=5, column=0, columnspan=2, sticky="ew", **pad)
        tk.Checkbutton(
            frame,
            text="РђРІС‚РѕРёРјСЏ РёР· СЃСЃС‹Р»РєРё",
            variable=self.auto_name_var,
            command=self.toggle_filename_state,
        ).grid(row=5, column=2, sticky="w", **pad)

        auth_frame = tk.LabelFrame(frame, text="РђРІС‚РѕСЂРёР·Р°С†РёСЏ")
        auth_frame.grid(row=6, column=0, columnspan=3, sticky="ew", padx=10, pady=8)
        tk.Label(auth_frame, text="HF token (РґР»СЏ РїСЂРёРІР°С‚РЅС‹С… РјРѕРґРµР»РµР№)").grid(row=0, column=0, sticky="w", **pad)
        self.token_entry = tk.Entry(auth_frame, textvariable=self.hf_token_var, show="*")
        self.token_entry.grid(row=1, column=0, columnspan=2, sticky="ew", **pad)
        tk.Checkbutton(
            auth_frame,
            text="РџРѕРєР°Р·Р°С‚СЊ С‚РѕРєРµРЅ",
            variable=self.show_token_var,
            command=self.toggle_token_visibility,
        ).grid(row=1, column=2, sticky="w", **pad)
        auth_frame.grid_columnconfigure(0, weight=1)
        auth_frame.grid_columnconfigure(1, weight=1)

        params = tk.LabelFrame(frame, text="РџР°СЂР°РјРµС‚СЂС‹ aria2")
        params.grid(row=7, column=0, columnspan=3, sticky="ew", padx=10, pady=8)

        tk.Label(params, text="РџСЂРµСЃРµС‚").grid(row=0, column=0, sticky="w", **pad)
        self.preset_combo = ttk.Combobox(
            params,
            textvariable=self.preset_var,
            values=list(self.presets.keys()),
            state="readonly",
            width=28,
        )
        self.preset_combo.grid(row=1, column=0, sticky="w", **pad)
        self.preset_combo.bind("<<ComboboxSelected>>", self.on_preset_change)

        tk.Label(params, text="РЎРѕРµРґРёРЅРµРЅРёСЏ (-x)").grid(row=0, column=1, sticky="w", **pad)
        self.connections_entry = tk.Entry(params, textvariable=self.connections_var, width=12)
        self.connections_entry.grid(row=1, column=1, sticky="w", **pad)

        tk.Label(params, text="РЎРµРіРјРµРЅС‚С‹ (-s)").grid(row=0, column=2, sticky="w", **pad)
        self.splits_entry = tk.Entry(params, textvariable=self.splits_var, width=12)
        self.splits_entry.grid(row=1, column=2, sticky="w", **pad)

        tk.Label(params, text="Р Р°Р·РјРµСЂ РєСѓСЃРєР° (-k)").grid(row=0, column=3, sticky="w", **pad)
        self.chunk_entry = tk.Entry(params, textvariable=self.chunk_var, width=12)
        self.chunk_entry.grid(row=1, column=3, sticky="w", **pad)

        tk.Label(params, text="User-Agent").grid(row=0, column=4, sticky="w", **pad)
        tk.Entry(params, textvariable=self.user_agent_var, width=22).grid(row=1, column=4, sticky="w", **pad)

        tk.Label(
            params,
            text="РџСЂРµСЃРµС‚С‹ РїРѕРґСЃС‚Р°РІР»СЏСЋС‚ РѕРїС‚РёРјР°Р»СЊРЅС‹Рµ Р·РЅР°С‡РµРЅРёСЏ. Р”Р»СЏ СЃРІРѕРёС… Р·РЅР°С‡РµРЅРёР№ РІС‹Р±РµСЂРё 'Р СѓС‡РЅРѕР№'.",
            anchor="w",
            justify="left",
        ).grid(row=2, column=0, columnspan=5, sticky="ew", padx=10, pady=(0, 8))
        tk.Label(params, text="Simultaneous downloads").grid(row=3, column=0, sticky="w", **pad)
        tk.Label(params, textvariable=self.max_concurrent_var).grid(row=3, column=1, sticky="w", **pad)
        tk.Button(params, text="Settings", command=self.open_settings_dialog).grid(row=3, column=2, sticky="w", **pad)

        tk.Checkbutton(frame, text="РџСЂРѕРґРѕР»Р¶Р°С‚СЊ РЅРµРґРѕРєР°С‡Р°РЅРЅСѓСЋ Р·Р°РіСЂСѓР·РєСѓ", variable=self.continue_var).grid(
            row=8, column=0, columnspan=2, sticky="w", **pad
        )

        progress_frame = tk.LabelFrame(frame, text="РџСЂРѕРіСЂРµСЃСЃ")
        progress_frame.grid(row=9, column=0, columnspan=3, sticky="ew", padx=10, pady=8)
        self.status_label = tk.Label(progress_frame, text="Р“РѕС‚РѕРІРѕ", anchor="w")
        self.status_label.grid(row=0, column=0, sticky="ew", padx=10, pady=(8, 4))
        self.progress = ttk.Progressbar(progress_frame, orient="horizontal", length=400, mode="indeterminate")
        self.progress.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 8))
        progress_frame.grid_columnconfigure(0, weight=1)

        buttons = tk.Frame(frame)
        buttons.grid(row=10, column=0, columnspan=3, sticky="ew", padx=10, pady=10)
        tk.Button(buttons, text="РЎРєР°С‡Р°С‚СЊ", height=2, command=self.start_downloads).pack(side="left", padx=5)
        tk.Button(buttons, text="РћСЃС‚Р°РЅРѕРІРёС‚СЊ", height=2, command=self.stop_download).pack(side="left", padx=5)
        tk.Button(buttons, text="РћС‡РёСЃС‚РёС‚СЊ Р»РѕРі", height=2, command=self.clear_log).pack(side="left", padx=5)
        tk.Button(buttons, text="РџРѕРєР°Р·Р°С‚СЊ РєРѕРјР°РЅРґСѓ", height=2, command=self.show_command).pack(side="left", padx=5)
        tk.Button(buttons, text="Р”РѕР±Р°РІРёС‚СЊ СЃСЃС‹Р»РєРё РёР· txt", height=2, command=self.load_links_from_file).pack(side="left", padx=5)

        tk.Label(frame, text="Р›РѕРі").grid(row=11, column=0, sticky="w", **pad)
        self.log = scrolledtext.ScrolledText(frame, wrap="word", height=18)
        self.log.grid(row=12, column=0, columnspan=3, sticky="nsew", padx=10, pady=(0, 10))

        frame.grid_columnconfigure(0, weight=1)
        frame.grid_columnconfigure(1, weight=1)
        frame.grid_columnconfigure(2, weight=0)
        frame.grid_rowconfigure(12, weight=1)

        self.toggle_filename_state()

    def _check_aria2(self) -> None:
        aria_path = shutil.which("aria2c")
        if aria_path:
            self.write_log(f"[OK] aria2c РЅР°Р№РґРµРЅ: {aria_path}\n")
        else:
            self.write_log("[WARN] aria2c РЅРµ РЅР°Р№РґРµРЅ РІ PATH. Р”РѕР±Р°РІСЊ aria2 РІ PATH РёР»Рё РїРѕР»РѕР¶Рё aria2c.exe СЂСЏРґРѕРј СЃРѕ СЃРєСЂРёРїС‚РѕРј.\n")

    def bind_clipboard_shortcuts(self) -> None:
        self.context_menu = tk.Menu(self.root, tearoff=0)
        self.context_menu.add_command(label="Р’СЃС‚Р°РІРёС‚СЊ", command=self.paste_urls_from_clipboard)
        self.context_menu.add_command(label="РљРѕРїРёСЂРѕРІР°С‚СЊ", command=lambda: self.safe_event_generate(self.urls_text, "<<Copy>>"))
        self.context_menu.add_command(label="Р’С‹СЂРµР·Р°С‚СЊ", command=lambda: self.safe_event_generate(self.urls_text, "<<Cut>>"))
        self.context_menu.add_separator()
        self.context_menu.add_command(label="Р’С‹РґРµР»РёС‚СЊ РІСЃС‘", command=self.select_all_urls)

        self.urls_text.bind("<Control-v>", self.handle_paste)
        self.urls_text.bind("<Control-V>", self.handle_paste)
        self.urls_text.bind("<Shift-Insert>", self.handle_paste)
        self.urls_text.bind("<Button-3>", self.show_context_menu)

    def safe_event_generate(self, widget: tk.Misc, sequence: str) -> None:
        try:
            widget.event_generate(sequence)
        except Exception:
            pass

    def show_context_menu(self, event) -> str:
        try:
            self.urls_text.focus_set()
            self.context_menu.tk_popup(event.x_root, event.y_root)
        finally:
            self.context_menu.grab_release()
        return "break"

    def handle_paste(self, event=None) -> str:
        self.paste_urls_from_clipboard()
        return "break"

    def paste_urls_from_clipboard(self) -> None:
        try:
            text = self.root.clipboard_get()
        except Exception:
            messagebox.showwarning("Р‘СѓС„РµСЂ РѕР±РјРµРЅР°", "РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ Р±СѓС„РµСЂ РѕР±РјРµРЅР°.")
            return

        if not text:
            return

        self.urls_text.focus_set()
        self.urls_text.insert("insert", text)

    def select_all_urls(self) -> None:
        self.urls_text.focus_set()
        self.urls_text.tag_add("sel", "1.0", "end-1c")

    def toggle_filename_state(self) -> None:
        state = "disabled" if self.auto_name_var.get() else "normal"
        self.filename_entry.configure(state=state)

    def toggle_token_visibility(self) -> None:
        self.token_entry.configure(show="" if self.show_token_var.get() else "*")

    def on_preset_change(self, event=None) -> None:
        self.apply_preset(self.preset_var.get())

    def apply_preset(self, preset_name: str) -> None:
        preset = self.presets.get(preset_name)
        if not preset:
            return
        self.connections_var.set(preset["x"])
        self.splits_var.set(preset["s"])
        self.chunk_var.set(preset["k"])

        manual = preset_name == "Р СѓС‡РЅРѕР№"
        state = "normal" if manual else "readonly"
        self.connections_entry.configure(state=state)
        self.splits_entry.configure(state=state)
        self.chunk_entry.configure(state=state)

    def choose_folder(self) -> None:
        folder = filedialog.askdirectory(initialdir=self.folder_var.get() or os.getcwd())
        if folder:
            self.folder_var.set(folder)

    def load_links_from_file(self) -> None:
        path = filedialog.askopenfilename(
            title="Р’С‹Р±РµСЂРё txt СЃРѕ СЃСЃС‹Р»РєР°РјРё",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = f.read().strip()
            if data:
                current = self.urls_text.get("1.0", "end-1c").strip()
                combined = (current + "\n" + data).strip() if current else data
                self.urls_text.delete("1.0", "end")
                self.urls_text.insert("1.0", combined)
                self.write_log(f"[OK] РЎСЃС‹Р»РєРё РґРѕР±Р°РІР»РµРЅС‹ РёР· С„Р°Р№Р»Р°: {path}\n")
        except Exception as exc:
            messagebox.showerror("РћС€РёР±РєР°", f"РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРѕС‡РёС‚Р°С‚СЊ С„Р°Р№Р»:\n{exc}")

    def load_settings(self) -> None:
        try:
            with open(self.settings_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except Exception:
            raw = {}

        try:
            value = int(raw.get("max_concurrent_downloads", 1))
        except Exception:
            value = 1
        value = max(1, min(16, value))
        self.max_concurrent_var.set(value)

    def save_settings(self) -> None:
        data = {"max_concurrent_downloads": int(self.max_concurrent_var.get())}
        try:
            with open(self.settings_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as exc:
            self.write_log(f"[WARN] Failed to save settings: {exc}\n")

    def open_settings_dialog(self) -> None:
        dialog = tk.Toplevel(self.root)
        dialog.title("Settings")
        dialog.transient(self.root)
        dialog.grab_set()
        dialog.resizable(False, False)

        frame = tk.Frame(dialog, padx=12, pady=12)
        frame.pack(fill="both", expand=True)
        tk.Label(frame, text="Max simultaneous downloads (1-16):").grid(row=0, column=0, sticky="w")

        value_var = tk.StringVar(value=str(self.max_concurrent_var.get()))
        spin = tk.Spinbox(frame, from_=1, to=16, textvariable=value_var, width=6)
        spin.grid(row=1, column=0, sticky="w", pady=(6, 10))
        spin.focus_set()

        buttons = tk.Frame(frame)
        buttons.grid(row=2, column=0, sticky="e")

        def save_and_close() -> None:
            try:
                value = int(value_var.get().strip())
            except ValueError:
                messagebox.showerror("Settings", "Enter a number from 1 to 16.")
                return
            if value < 1 or value > 16:
                messagebox.showerror("Settings", "Enter a number from 1 to 16.")
                return
            self.max_concurrent_var.set(value)
            self.save_settings()
            self.write_log(f"[INFO] Max simultaneous downloads set to {value}\n")
            dialog.destroy()

        tk.Button(buttons, text="Save", width=10, command=save_and_close).pack(side="left", padx=(0, 6))
        tk.Button(buttons, text="Cancel", width=10, command=dialog.destroy).pack(side="left")

    def write_log(self, text: str) -> None:
        self.log.insert("end", text)
        self.log.see("end")

    def clear_log(self) -> None:
        self.log.delete("1.0", "end")

    def set_status(self, text: str) -> None:
        self.current_status = text
        self.status_label.configure(text=text)

    def set_progress_mode(self, mode: str) -> None:
        if mode not in ("indeterminate", "determinate"):
            return
        if self.progress_mode != mode:
            if self.progress_started:
                self.progress.stop()
                self.progress_started = False
            self.progress.configure(mode=mode)
            self.progress_mode = mode
            if mode == "determinate":
                self.progress.configure(maximum=100)

    def start_progress(self) -> None:
        if self.progress_mode == "indeterminate" and not self.progress_started:
            self.progress.start(12)
            self.progress_started = True

    def stop_progress(self) -> None:
        if self.progress_started:
            self.progress.stop()
            self.progress_started = False

    def set_progress_value(self, value: float) -> None:
        self.progress_value = max(0.0, min(100.0, value))
        self.progress["value"] = self.progress_value

    def reset_progress(self) -> None:
        self.set_progress_mode("indeterminate")
        self.stop_progress()
        self.progress["value"] = 0
        self.progress_value = 0.0

    def _register_active_process(self, item_id: int, process: subprocess.Popen) -> None:
        with self.active_processes_lock:
            self.active_processes[item_id] = process

    def _unregister_active_process(self, item_id: int) -> None:
        with self.active_processes_lock:
            self.active_processes.pop(item_id, None)

    def _terminate_active_processes(self) -> int:
        with self.active_processes_lock:
            active = [proc for proc in self.active_processes.values() if proc.poll() is None]
        for proc in active:
            try:
                proc.terminate()
            except Exception:
                pass
        return len(active)

    def _has_active_processes(self) -> bool:
        with self.active_processes_lock:
            return any(proc.poll() is None for proc in self.active_processes.values())

    def _reset_queue_progress_state(self, total_items: int) -> None:
        with self.queue_progress_lock:
            self.queue_total_items = max(1, total_items)
            self.queue_completed_items = 0
            self.queue_running_progress.clear()

    def _emit_queue_progress(self) -> None:
        with self.queue_progress_lock:
            running = sum(self.queue_running_progress.values()) / 100.0
            value = ((self.queue_completed_items + running) / self.queue_total_items) * 100.0
        self.gui_queue.put(("progress_mode", "determinate"))
        self.gui_queue.put(("progress_value", value))

    def _update_item_progress(self, item_id: int, percent: float) -> None:
        with self.queue_progress_lock:
            self.queue_running_progress[item_id] = max(0.0, min(100.0, percent))
        self._emit_queue_progress()

    def _mark_item_complete(self, item_id: int) -> None:
        with self.queue_progress_lock:
            self.queue_running_progress.pop(item_id, None)
            self.queue_completed_items = min(self.queue_total_items, self.queue_completed_items + 1)
        self._emit_queue_progress()

    def get_urls(self) -> list[str]:
        raw = self.urls_text.get("1.0", "end")
        return [line.strip() for line in raw.splitlines() if line.strip()]

    def infer_filename_from_url(self, url: str) -> str:
        parsed = urlparse(url)
        name = os.path.basename(parsed.path)
        return unquote(name) if name else "downloaded_file"

    def validate_inputs(self) -> bool:
        urls = self.get_urls()
        folder = self.folder_var.get().strip()

        if not urls:
            messagebox.showerror("РћС€РёР±РєР°", "Р’СЃС‚Р°РІСЊ С…РѕС‚СЏ Р±С‹ РѕРґРЅСѓ СЃСЃС‹Р»РєСѓ")
            return False

        bad = [u for u in urls if not (u.startswith("http://") or u.startswith("https://"))]
        if bad:
            messagebox.showerror("РћС€РёР±РєР°", "РќРµРєРѕСЂСЂРµРєС‚РЅС‹Рµ СЃСЃС‹Р»РєРё:\n\n" + "\n".join(bad[:10]))
            return False

        if not folder:
            messagebox.showerror("РћС€РёР±РєР°", "РЈРєР°Р¶Рё РїР°РїРєСѓ Р·Р°РіСЂСѓР·РєРё")
            return False

        os.makedirs(folder, exist_ok=True)

        try:
            x = int(self.connections_var.get().strip())
            s = int(self.splits_var.get().strip())
            if x <= 0 or s <= 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("РћС€РёР±РєР°", "РџРѕР»СЏ -x Рё -s РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ РїРѕР»РѕР¶РёС‚РµР»СЊРЅС‹РјРё С‡РёСЃР»Р°РјРё")
            return False

        if not self.chunk_var.get().strip():
            messagebox.showerror("РћС€РёР±РєР°", "РџРѕР»Рµ -k РЅРµ РґРѕР»Р¶РЅРѕ Р±С‹С‚СЊ РїСѓСЃС‚С‹Рј")
            return False

        if len(urls) > 1 and not self.auto_name_var.get() and self.filename_var.get().strip():
            messagebox.showwarning(
                "Р’РЅРёРјР°РЅРёРµ",
                "РџСЂРё РѕС‡РµСЂРµРґРё РёР· РЅРµСЃРєРѕР»СЊРєРёС… СЃСЃС‹Р»РѕРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРµ РёРјСЏ С„Р°Р№Р»Р° РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ. Р”Р»СЏ РєР°Р¶РґРѕРіРѕ С„Р°Р№Р»Р° Р±СѓРґРµС‚ РІР·СЏС‚Рѕ РёРјСЏ РёР· СЃСЃС‹Р»РєРё.",
            )

        return True

    def build_command(self, url: str, use_custom_name: bool) -> list[str]:
        folder = self.folder_var.get().strip()
        filename = self.filename_var.get().strip()
        token = self.hf_token_var.get().strip()

        if not use_custom_name or self.auto_name_var.get() or not filename:
            filename = self.infer_filename_from_url(url)

        cmd = [
            "aria2c",
            "-d",
            folder,
            "-x",
            self.connections_var.get().strip(),
            "-s",
            self.splits_var.get().strip(),
            "-k",
            self.chunk_var.get().strip(),
            "--header",
            f"User-Agent: {self.user_agent_var.get().strip() or 'Mozilla/5.0'}",
        ]

        if token:
            cmd.extend(["--header", f"Authorization: Bearer {token}"])

        if self.continue_var.get():
            cmd.append("-c")

        cmd.extend(["-o", filename, url])
        return cmd

    def mask_token_in_cmd(self, cmd: list[str]) -> list[str]:
        masked = []
        for item in cmd:
            if item.startswith("Authorization: Bearer "):
                masked.append("Authorization: Bearer ***")
            else:
                masked.append(item)
        return masked

    def show_command(self) -> None:
        if not self.validate_inputs():
            return
        urls = self.get_urls()
        sample = urls[0]
        cmd = self.build_command(sample, use_custom_name=(len(urls) == 1))
        self.write_log("[CMD] " + subprocess.list2cmdline(self.mask_token_in_cmd(cmd)) + "\n")

    def start_downloads(self) -> None:
        if self.download_thread and self.download_thread.is_alive():
            messagebox.showinfo("РћС‡РµСЂРµРґСЊ СѓР¶Рµ РёРґС‘С‚", "РЎРЅР°С‡Р°Р»Р° РѕСЃС‚Р°РЅРѕРІРё С‚РµРєСѓС‰СѓСЋ РѕС‡РµСЂРµРґСЊ.")
            return
        if self._has_active_processes():
            messagebox.showinfo("Queue is running", "Stop active downloads first.")
            return

        if not self.validate_inputs():
            return

        urls = self.get_urls()
        total = len(urls)
        max_parallel = max(1, min(int(self.max_concurrent_var.get()), total))

        self.stop_requested = False
        self.reset_progress()
        self._reset_queue_progress_state(total)
        self.set_status(f"Preparing queue ({total} items, up to {max_parallel} at once)...")
        self.set_progress_mode("determinate")
        self.set_progress_value(0.0)

        def queue_worker() -> None:
            ok_count = 0
            fail_count = 0
            counters_lock = threading.Lock()
            tasks: queue.Queue[tuple[int, str]] = queue.Queue()
            for index, url in enumerate(urls, start=1):
                tasks.put((index, url))

            def worker() -> None:
                nonlocal ok_count, fail_count
                while not self.stop_requested:
                    try:
                        index, url = tasks.get_nowait()
                    except queue.Empty:
                        break

                    use_custom_name = total == 1
                    filename = (
                        self.filename_var.get().strip()
                        if use_custom_name and not self.auto_name_var.get()
                        else self.infer_filename_from_url(url)
                    )
                    cmd = self.build_command(url, use_custom_name=use_custom_name)
                    display_cmd = self.mask_token_in_cmd(cmd)

                    self.gui_queue.put(("status", f"Downloading {index}/{total}: {filename}"))
                    self.gui_queue.put(("log", f"\n[START {index}/{total}] {subprocess.list2cmdline(display_cmd)}\n"))

                    code = self.run_single_download(cmd, item_id=index, total_items=total)
                    self._mark_item_complete(index)

                    if code == 0:
                        with counters_lock:
                            ok_count += 1
                        self.gui_queue.put(("log", f"[OK] Done: {filename}\n"))
                    elif self.stop_requested:
                        self.gui_queue.put(("log", f"[STOP] Stopped: {filename}\n"))
                    else:
                        with counters_lock:
                            fail_count += 1
                        self.gui_queue.put(("log", f"[ERR] Failed: {filename} (code {code})\n"))
                    tasks.task_done()

            workers = [threading.Thread(target=worker, daemon=True) for _ in range(max_parallel)]
            for worker_thread in workers:
                worker_thread.start()
            for worker_thread in workers:
                worker_thread.join()

            if self.stop_requested:
                self.gui_queue.put(("log", "\n[STOP] Queue stopped by user.\n"))
                self.gui_queue.put(("status", "Stopped"))
            else:
                self.gui_queue.put(("status", f"Done. Successful: {ok_count}, failed: {fail_count}"))
            self.gui_queue.put(("done", None))

        self.download_thread = threading.Thread(target=queue_worker, daemon=True)
        self.download_thread.start()

    def run_single_download(self, cmd: list[str], item_id: int, total_items: int) -> int:
        process: subprocess.Popen | None = None
        try:
            creationflags = 0
            if sys.platform.startswith("win"):
                creationflags = subprocess.CREATE_NO_WINDOW

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=creationflags,
            )
            self._register_active_process(item_id, process)

            assert process.stdout is not None
            for line in process.stdout:
                self.gui_queue.put(("log", f"[{item_id}/{total_items}] {line}"))
                pct = self.extract_percent(line)
                if pct is not None:
                    self._update_item_progress(item_id, pct)

            return process.wait()
        except FileNotFoundError:
            self.gui_queue.put(("error", "РќРµ РЅР°Р№РґРµРЅ aria2c. Р”РѕР±Р°РІСЊ РµРіРѕ РІ PATH РёР»Рё РїРѕР»РѕР¶Рё aria2c.exe СЂСЏРґРѕРј СЃРѕ СЃРєСЂРёРїС‚РѕРј."))
            return 127
        except Exception as exc:
            self.gui_queue.put(("log", f"[ERR] {exc}\n"))
            return 1
        finally:
            self._unregister_active_process(item_id)

    def extract_percent(self, line: str) -> float | None:
        for token in line.replace("(", " ").replace(")", " ").split():
            cleaned = token.strip()
            if cleaned.startswith("[") and cleaned.endswith("%]"):
                num = cleaned[1:-2]
                try:
                    return float(num)
                except ValueError:
                    pass
            if cleaned.endswith("%"):
                num = cleaned.rstrip("%[]")
                try:
                    return float(num)
                except ValueError:
                    pass
        return None

    def stop_download(self) -> None:
        self.stop_requested = True
        stopped = self._terminate_active_processes()
        if stopped > 0:
            self.write_log(f"\n[STOP] Stopping {stopped} active download(s)...\n")
        else:
            self.write_log("[INFO] No active downloads.\n")

    def process_gui_queue(self) -> None:
        while True:
            try:
                action, payload = self.gui_queue.get_nowait()
            except queue.Empty:
                break

            if action == "log":
                self.write_log(str(payload))
            elif action == "status":
                self.set_status(str(payload))
            elif action == "progress_mode":
                self.set_progress_mode(str(payload))
            elif action == "progress_start":
                self.start_progress()
            elif action == "progress_stop":
                self.stop_progress()
            elif action == "progress_value":
                self.set_progress_value(float(payload))
            elif action == "error":
                self.stop_progress()
                messagebox.showerror("РћС€РёР±РєР°", str(payload))
            elif action == "done":
                self.stop_progress()

        self.root.after(100, self.process_gui_queue)


def main() -> None:
    root = tk.Tk()
    ttk.Style().theme_use("clam")
    Aria2DownloaderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()


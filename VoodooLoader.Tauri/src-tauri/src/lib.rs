use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

const QUEUE_SNAPSHOT_EVENT: &str = "queue://snapshot";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueueItem {
    id: String,
    selected: bool,
    file_name: String,
    url: String,
    destination: String,
    status: String,
    progress: f32,
    speed: String,
    eta: String,
    total_size: String,
    priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogEntry {
    level: String,
    message: String,
    timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueueSnapshot {
    is_running: bool,
    items: Vec<QueueItem>,
    logs: Vec<LogEntry>,
}

#[derive(Default)]
struct QueueStore {
    runtime: Mutex<QueueRuntime>,
}

#[derive(Default)]
struct QueueRuntime {
    next_id: u64,
    ticker_active: bool,
    is_running: bool,
    items: Vec<QueueItem>,
    logs: Vec<LogEntry>,
}

fn now_timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    secs.to_string()
}

fn file_name_from_url(url: &str) -> String {
    let trimmed = url.trim_end_matches('/');
    if let Some(last) = trimmed.rsplit('/').next() {
        if !last.is_empty() {
            return last.to_string();
        }
    }
    "download.bin".to_string()
}

fn push_log(runtime: &mut QueueRuntime, level: &str, message: String) {
    runtime.logs.push(LogEntry {
        level: level.to_string(),
        message,
        timestamp: now_timestamp(),
    });

    if runtime.logs.len() > 250 {
        let drain = runtime.logs.len() - 250;
        runtime.logs.drain(0..drain);
    }
}

fn snapshot_from_runtime(runtime: &QueueRuntime) -> QueueSnapshot {
    QueueSnapshot {
        is_running: runtime.is_running,
        items: runtime.items.clone(),
        logs: runtime.logs.clone(),
    }
}

fn emit_snapshot(app: &AppHandle, snapshot: &QueueSnapshot) -> Result<(), String> {
    app.emit(QUEUE_SNAPSHOT_EVENT, snapshot)
        .map_err(|e| format!("failed to emit queue snapshot: {e}"))
}

fn run_queue_tick(runtime: &mut QueueRuntime) {
    if runtime.items.is_empty() {
        return;
    }

    let active_idx = runtime.items.iter().position(|item| {
        item.status.eq_ignore_ascii_case("queued") || item.status.eq_ignore_ascii_case("downloading")
    });

    let Some(idx) = active_idx else {
        return;
    };

    let mut log_to_push: Option<(String, String)> = None;
    {
        let item = &mut runtime.items[idx];

        if item.status.eq_ignore_ascii_case("queued") {
            item.status = "Downloading".to_string();
            item.speed = "2.4 MB/s".to_string();
            item.eta = "00:12".to_string();
            log_to_push = Some(("INFO".to_string(), format!("Started download: {}", item.file_name)));
        } else {
            item.progress = (item.progress + 11.5).clamp(0.0, 100.0);
            if item.progress >= 100.0 {
                item.progress = 100.0;
                item.status = "Completed".to_string();
                item.speed = "0 MB/s".to_string();
                item.eta = "--".to_string();
                log_to_push = Some((
                    "SUCCESS".to_string(),
                    format!("Completed: {}", item.file_name),
                ));
            }
        }
    }

    if let Some((level, message)) = log_to_push {
        push_log(runtime, &level, message);
    }
}

fn spawn_queue_worker(app: AppHandle, store: Arc<QueueStore>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(900));

        let (snapshot, should_break) = {
            let mut runtime = store
                .runtime
                .lock()
                .expect("queue runtime mutex should not be poisoned");

            if !runtime.is_running {
                runtime.ticker_active = false;
                (snapshot_from_runtime(&runtime), true)
            } else {
                run_queue_tick(&mut runtime);

                let all_done = runtime
                    .items
                    .iter()
                    .all(|it| it.status.eq_ignore_ascii_case("completed"));

                if all_done {
                    runtime.is_running = false;
                    runtime.ticker_active = false;
                    push_log(&mut runtime, "INFO", "Queue finished".to_string());
                    (snapshot_from_runtime(&runtime), true)
                } else {
                    (snapshot_from_runtime(&runtime), false)
                }
            }
        };

        let _ = emit_snapshot(&app, &snapshot);

        if should_break {
            break;
        }
    });
}

#[tauri::command]
fn queue_snapshot(state: State<'_, Arc<QueueStore>>) -> QueueSnapshot {
    let runtime = state
        .runtime
        .lock()
        .expect("queue runtime mutex should not be poisoned");
    snapshot_from_runtime(&runtime)
}

#[tauri::command]
fn add_queue_item(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
    url: String,
    destination: String,
    file_name: Option<String>,
) -> Result<QueueSnapshot, String> {
    if url.trim().is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        runtime.next_id += 1;
        let resolved_file_name = file_name
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(|v| v.trim().to_string())
            .unwrap_or_else(|| file_name_from_url(&url));

        runtime.items.push(QueueItem {
            id: format!("q-{0:06}", runtime.next_id),
            selected: false,
            file_name: resolved_file_name.clone(),
            url: url.trim().to_string(),
            destination: destination.trim().to_string(),
            status: "Queued".to_string(),
            progress: 0.0,
            speed: "0 MB/s".to_string(),
            eta: "--".to_string(),
            total_size: "unknown".to_string(),
            priority: "Medium".to_string(),
        });

        push_log(
            &mut runtime,
            "INFO",
            format!("Added to queue: {resolved_file_name}"),
        );
        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn remove_queue_item(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
    id: String,
) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        let before = runtime.items.len();
        runtime.items.retain(|item| item.id != id);

        if before == runtime.items.len() {
            push_log(
                &mut runtime,
                "WARN",
                format!("Queue item not found: {id}"),
            );
        } else {
            push_log(&mut runtime, "INFO", format!("Removed item: {id}"));
        }

        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn start_queue(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
) -> Result<QueueSnapshot, String> {
    let should_spawn = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        if runtime.items.is_empty() {
            push_log(
                &mut runtime,
                "WARN",
                "Start ignored: queue is empty".to_string(),
            );
            false
        } else {
            runtime.is_running = true;
            push_log(&mut runtime, "INFO", "Queue started".to_string());
            if runtime.ticker_active {
                false
            } else {
                runtime.ticker_active = true;
                true
            }
        }
    };

    let snapshot = queue_snapshot(state.clone());
    emit_snapshot(&app, &snapshot)?;

    if should_spawn {
        spawn_queue_worker(app, state.inner().clone());
    }

    Ok(snapshot)
}

#[tauri::command]
fn stop_queue(app: AppHandle, state: State<'_, Arc<QueueStore>>) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;
        runtime.is_running = false;
        push_log(&mut runtime, "INFO", "Queue stopped".to_string());
        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn clear_logs(app: AppHandle, state: State<'_, Arc<QueueStore>>) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;
        runtime.logs.clear();
        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn clear_queue(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;
        runtime.items.clear();
        runtime.is_running = false;
        push_log(&mut runtime, "INFO", "Queue cleared".to_string());
        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let store = Arc::<QueueStore>::default();

    tauri::Builder::default()
        .manage(store)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            queue_snapshot,
            add_queue_item,
            remove_queue_item,
            start_queue,
            stop_queue,
            clear_logs,
            clear_queue
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

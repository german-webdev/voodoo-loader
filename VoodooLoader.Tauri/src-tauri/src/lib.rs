use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};

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
    attempts: u32,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PreviewCommandInput {
    url: String,
    destination: String,
    file_name: Option<String>,
    auth_mode: String,
    token: Option<String>,
    username: Option<String>,
    password: Option<String>,
    extra_headers: Option<String>,
    continue_download: bool,
    max_connections: u32,
}

fn now_timestamp() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    secs.to_string()
}

fn is_active_status(status: &str) -> bool {
    status.eq_ignore_ascii_case("queued") || status.eq_ignore_ascii_case("downloading")
}

fn is_retryable_status(status: &str) -> bool {
    status.eq_ignore_ascii_case("failed") || status.eq_ignore_ascii_case("canceled")
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

fn parse_url_lines(raw: &str) -> Vec<String> {
    raw.lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .map(ToOwned::to_owned)
        .collect()
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

fn reset_item_for_retry(item: &mut QueueItem) {
    item.status = "Queued".to_string();
    item.progress = 0.0;
    item.speed = "0 MB/s".to_string();
    item.eta = "--".to_string();
}

fn run_queue_tick(runtime: &mut QueueRuntime) {
    if runtime.items.is_empty() {
        return;
    }

    let active_idx = runtime.items.iter().position(|item| is_active_status(&item.status));

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
            log_to_push = Some((
                "INFO".to_string(),
                format!("Started download: {}", item.file_name),
            ));
        } else {
            item.progress = (item.progress + 11.5).clamp(0.0, 100.0);

            let should_fail_once =
                item.progress >= 55.0 && item.attempts == 0 && item.id.ends_with('3');
            if should_fail_once {
                item.status = "Failed".to_string();
                item.speed = "0 MB/s".to_string();
                item.eta = "--".to_string();
                item.attempts += 1;
                log_to_push = Some((
                    "ERROR".to_string(),
                    format!("Failed: {} (simulated timeout)", item.file_name),
                ));
            } else if item.progress >= 100.0 {
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
                let has_active = runtime.items.iter().any(|it| is_active_status(&it.status));
                if !has_active {
                    runtime.is_running = false;
                    runtime.ticker_active = false;
                    let has_failed = runtime
                        .items
                        .iter()
                        .any(|it| it.status.eq_ignore_ascii_case("failed"));
                    if has_failed {
                        push_log(
                            &mut runtime,
                            "WARN",
                            "Queue stopped: some items failed".to_string(),
                        );
                    } else {
                        push_log(&mut runtime, "INFO", "Queue finished".to_string());
                    }
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

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

fn mask_secret(value: &str) -> String {
    if value.trim().is_empty() {
        String::new()
    } else {
        "******".to_string()
    }
}

fn mask_header_line(line: &str) -> String {
    if let Some((key, value)) = line.split_once(':') {
        let key_trimmed = key.trim();
        let key_lower = key_trimmed.to_ascii_lowercase();
        let value_trimmed = value.trim();
        if key_lower.contains("authorization")
            || key_lower.contains("token")
            || key_lower.contains("password")
            || key_lower.contains("cookie")
        {
            format!("{key_trimmed}: {}", mask_secret(value_trimmed))
        } else {
            format!("{key_trimmed}: {value_trimmed}")
        }
    } else {
        line.trim().to_string()
    }
}

fn add_extra_headers(args: &mut Vec<String>, raw: Option<&str>) {
    if let Some(raw_headers) = raw {
        for line in raw_headers.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            let masked = mask_header_line(trimmed);
            args.push(format!("--header={}", shell_quote(&masked)));
        }
    }
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
            attempts: 0,
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
fn add_queue_items_from_text(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
    text: String,
    destination: String,
) -> Result<QueueSnapshot, String> {
    let urls = parse_url_lines(&text);
    if urls.is_empty() {
        return Err("No valid URLs found in input text".to_string());
    }

    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        for url in urls.iter() {
            runtime.next_id += 1;
            runtime.items.push(QueueItem {
                id: format!("q-{0:06}", runtime.next_id),
                selected: false,
                file_name: file_name_from_url(url),
                url: url.clone(),
                destination: destination.trim().to_string(),
                status: "Queued".to_string(),
                progress: 0.0,
                speed: "0 MB/s".to_string(),
                eta: "--".to_string(),
                total_size: "unknown".to_string(),
                priority: "Medium".to_string(),
                attempts: 0,
            });
        }

        push_log(
            &mut runtime,
            "INFO",
            format!("Imported {} URL(s) from text", urls.len()),
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
fn retry_queue_item(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
    id: String,
) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        let log_message = if let Some(idx) = runtime.items.iter().position(|item| item.id == id) {
            let item = &mut runtime.items[idx];
            if item.status.eq_ignore_ascii_case("downloading") {
                (
                    "WARN",
                    format!("Cannot retry active item: {}", item.file_name),
                )
            } else {
                reset_item_for_retry(item);
                ("INFO", format!("Retried item: {}", item.file_name))
            }
        } else {
            ("WARN", format!("Retry skipped: item not found ({id})"))
        };

        push_log(&mut runtime, log_message.0, log_message.1);

        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn retry_failed_items(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        let mut retried_count = 0usize;
        for item in runtime.items.iter_mut() {
            if is_retryable_status(&item.status) {
                reset_item_for_retry(item);
                retried_count += 1;
            }
        }

        if retried_count == 0 {
            push_log(&mut runtime, "WARN", "No failed items to retry".to_string());
        } else {
            push_log(
                &mut runtime,
                "INFO",
                format!("Retried {retried_count} failed item(s)"),
            );
        }

        snapshot_from_runtime(&runtime)
    };

    emit_snapshot(&app, &snapshot)?;
    Ok(snapshot)
}

#[tauri::command]
fn remove_failed_items(
    app: AppHandle,
    state: State<'_, Arc<QueueStore>>,
) -> Result<QueueSnapshot, String> {
    let snapshot = {
        let mut runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;

        let before = runtime.items.len();
        runtime.items.retain(|item| !is_retryable_status(&item.status));
        let removed = before.saturating_sub(runtime.items.len());

        if removed == 0 {
            push_log(&mut runtime, "WARN", "No failed items to remove".to_string());
        } else {
            push_log(
                &mut runtime,
                "INFO",
                format!("Removed {removed} failed item(s)"),
            );
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
        } else if !runtime.items.iter().any(|it| is_active_status(&it.status)) {
            push_log(
                &mut runtime,
                "WARN",
                "Start ignored: no queued items (retry failed first)".to_string(),
            );
            runtime.is_running = false;
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

    let snapshot = {
        let runtime = state
            .runtime
            .lock()
            .map_err(|_| "queue runtime lock failed".to_string())?;
        snapshot_from_runtime(&runtime)
    };
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

#[tauri::command]
fn build_preview_command(input: PreviewCommandInput) -> Result<String, String> {
    if input.url.trim().is_empty() {
        return Err("URL is required for command preview".to_string());
    }

    let mut args = vec![
        "aria2c".to_string(),
        format!("--dir={}", shell_quote(input.destination.trim())),
    ];

    if let Some(file_name) = input.file_name.as_deref() {
        if !file_name.trim().is_empty() {
            args.push(format!("-o {}", shell_quote(file_name.trim())));
        }
    }

    if input.continue_download {
        args.push("-c".to_string());
    }

    if input.max_connections > 0 {
        args.push(format!(
            "--max-connection-per-server={}",
            input.max_connections
        ));
    }

    let mode = input.auth_mode.trim().to_ascii_lowercase();
    if mode == "token" {
        if let Some(token) = input.token.as_deref() {
            if !token.trim().is_empty() {
                let header = format!("Authorization: Bearer {}", mask_secret(token));
                args.push(format!("--header={}", shell_quote(&header)));
            }
        }
    } else if mode == "basic" || mode == "login_password" {
        if let Some(user) = input.username.as_deref() {
            if !user.trim().is_empty() {
                args.push(format!("--http-user={}", shell_quote(user.trim())));
            }
        }
        if let Some(pass) = input.password.as_deref() {
            if !pass.trim().is_empty() {
                args.push(format!(
                    "--http-passwd={}",
                    shell_quote(&mask_secret(pass.trim()))
                ));
            }
        }
    }

    add_extra_headers(&mut args, input.extra_headers.as_deref());
    args.push(shell_quote(input.url.trim()));

    Ok(args.join(" "))
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
            add_queue_items_from_text,
            remove_queue_item,
            retry_queue_item,
            retry_failed_items,
            remove_failed_items,
            start_queue,
            stop_queue,
            clear_logs,
            clear_queue,
            build_preview_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

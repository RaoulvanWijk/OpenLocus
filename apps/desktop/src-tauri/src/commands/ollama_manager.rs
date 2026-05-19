use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager, State};
use tokio::task::AbortHandle;

use crate::commands::DbState;

pub struct OllamaProcessState(pub Mutex<Option<std::process::Child>>);

pub struct ActiveDownloads(pub Mutex<HashMap<String, AbortHandle>>);

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
pub struct OllamaHealth {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
}

/// Returns the path to an existing Ollama binary, checking well-known locations
/// before falling back to the app-managed copy in Application Support.
fn find_ollama_binary() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        let system_candidates = [
            "/Applications/Ollama.app/Contents/Resources/ollama",
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
        ];
        for path in system_candidates {
            if std::path::Path::new(path).exists() {
                return Some(PathBuf::from(path));
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let system_candidates = ["/usr/local/bin/ollama", "/usr/bin/ollama"];
        for path in system_candidates {
            if std::path::Path::new(path).exists() {
                return Some(PathBuf::from(path));
            }
        }
    }

    // App-managed copy (all platforms except Windows)
    #[cfg(not(target_os = "windows"))]
    if let Some(data_dir) = dirs_next::data_dir() {
        let bundled = data_dir.join("OpenLocus/ollama");
        if bundled.exists() {
            return Some(bundled);
        }
    }

    // Windows: rely on PATH
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        if std::process::Command::new("where")
            .arg("ollama")
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return Some(PathBuf::from("ollama"));
        }
    }

    None
}


#[command]
pub async fn list_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let response: serde_json::Value = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let models = response["models"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|m| m["name"].as_str().map(|s| s.to_string()))
        .collect();
    Ok(models)
}

#[command]
pub async fn pull_model(
    app_handle: AppHandle,
    state: State<'_, ActiveDownloads>,
    model_id: String,
    model_name: String,
) -> Result<(), String> {
    {
        let map = state.0.lock().map_err(|_| "ActiveDownloads lock failed")?;
        if map.contains_key(&model_id) {
            return Ok(());
        }
    }

    let client = reqwest::Client::new();
    let mut res = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let task_app_handle = app_handle.clone();
    let task_model_id = model_id.clone();

    let join = tokio::spawn(async move {
        let mut succeeded = false;
        while let Ok(Some(chunk)) = res.chunk().await {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&chunk) {
                let status = json.get("status").and_then(|v| v.as_str()).unwrap_or("");
                let mut payload = serde_json::Map::new();
                payload.insert("model_id".into(), serde_json::Value::String(task_model_id.clone()));
                payload.insert("status".into(), serde_json::Value::String(status.to_string()));
                if let Some(completed) = json.get("completed").and_then(|v| v.as_u64()) {
                    payload.insert("completed".into(), serde_json::Value::from(completed));
                }
                if let Some(total) = json.get("total").and_then(|v| v.as_u64()) {
                    payload.insert("total".into(), serde_json::Value::from(total));
                }
                let _ = task_app_handle.emit("model-pull-progress", serde_json::Value::Object(payload));

                if status == "success" {
                    succeeded = true;
                    if let Some(db_state) = task_app_handle.try_state::<DbState>() {
                        if let Ok(conn) = db_state.0.lock() {
                            let _ = conn.execute(
                                "UPDATE models SET downloaded = 1 WHERE id = ?1",
                                [&task_model_id],
                            );
                        }
                    }
                }
            }
        }

        if !succeeded {
            // Emit a terminal event so the frontend can clean up partial progress
            // when the stream ends without a "success" (e.g. network error).
            let _ = task_app_handle.emit(
                "model-pull-progress",
                serde_json::json!({
                    "model_id": task_model_id,
                    "status": "ended",
                }),
            );
        }

        if let Some(downloads) = task_app_handle.try_state::<ActiveDownloads>() {
            if let Ok(mut map) = downloads.0.lock() {
                map.remove(&task_model_id);
            }
        }
    });

    {
        let mut map = state.0.lock().map_err(|_| "ActiveDownloads lock failed")?;
        map.insert(model_id, join.abort_handle());
    }

    Ok(())
}

#[command]
pub fn cancel_model_pull(
    app_handle: AppHandle,
    state: State<'_, ActiveDownloads>,
    model_id: String,
) -> Result<(), String> {
    let handle = {
        let mut map = state.0.lock().map_err(|_| "ActiveDownloads lock failed")?;
        map.remove(&model_id)
    };

    if let Some(handle) = handle {
        handle.abort();
    }

    let _ = app_handle.emit(
        "model-pull-progress",
        serde_json::json!({
            "model_id": model_id,
            "status": "cancelled",
        }),
    );

    Ok(())
}

fn emit_log(app_handle: &AppHandle, msg: impl Into<String>) {
    let msg = msg.into();
    tracing::info!("[ollama-install] {}", msg);
    let _ = app_handle.emit("ollama-install-log", msg);
}

#[command]
pub async fn install_ollama(app_handle: AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    #[cfg(target_os = "windows")]
    let cmd = app_handle.shell().command("powershell").args([
        "-WindowStyle",
        "Hidden",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "irm https://ollama.com/install.ps1 | iex",
    ]);

    #[cfg(target_os = "macos")]
    let cmd = app_handle.shell().command("osascript").args([
        "-e",
        "do shell script \"curl -fsSL https://ollama.com/install.sh | sh\" with administrator privileges",
    ]);

    #[cfg(target_os = "linux")]
    let cmd = app_handle.shell().command("sh").args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"]);

    emit_log(&app_handle, "Starting Ollama installation...");

    let (mut rx, _child) = cmd.spawn().map_err(|e| format!("Failed to launch installer: {}", e))?;
    let mut success = false;

    while let Some(event) = rx.recv().await {
        match event {
            tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                let log = String::from_utf8_lossy(&line).to_string();
                emit_log(&app_handle, log);
            }
            tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                let log = String::from_utf8_lossy(&line).to_string();
                tracing::warn!("[ollama-install stderr] {}", log);
            }
            tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                tracing::info!("Installer exited with code: {:?}", payload.code);
                success = payload.code.unwrap_or(1) == 0;
            }
            _ => {}
        }
    }

    if !success {
        return Err("Installation failed. Check logs for details.".into());
    }

    emit_log(&app_handle, "Installation complete.");
    Ok(())
}

#[command]
pub async fn check_ollama_health() -> Result<OllamaHealth, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()
        .unwrap();

    let response = client.get("http://localhost:11434/api/version").send().await;

    match response {
        Ok(res) => {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                return Ok(OllamaHealth {
                    installed: true,
                    running: true,
                    version: json["version"].as_str().map(|s| s.to_string()),
                });
            }
        }
        Err(_) => {
            // Not running — check if the binary exists anywhere
            if find_ollama_binary().is_some() {
                return Ok(OllamaHealth {
                    installed: true,
                    running: false,
                    version: None,
                });
            }
        }
    }

    Ok(OllamaHealth {
        installed: false,
        running: false,
        version: None,
    })
}

pub fn start_engine_if_needed(app_handle: AppHandle) {
    let state = app_handle.state::<OllamaProcessState>();
    let mut lock = state.0.lock().expect("Failed to lock OllamaProcessState");
    if lock.is_some() {
        return;
    }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "ollama app.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }

    let binary = find_ollama_binary().unwrap_or_else(|| PathBuf::from("ollama"));

    let mut cmd = std::process::Command::new(&binary);
    cmd.args(["serve"]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    if let Ok(child) = cmd.spawn() {
        *lock = Some(child);
    }
}

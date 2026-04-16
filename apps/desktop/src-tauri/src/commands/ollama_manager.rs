use serde::Serialize;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::ShellExt;

pub struct OllamaProcessState(pub Mutex<Option<std::process::Child>>);

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
pub struct OllamaHealth {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
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
pub async fn pull_model(app_handle: AppHandle, model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut res = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Ok(Some(chunk)) = res.chunk().await {
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&chunk) {
                let _ = app_handle.emit("model-pull-progress", json);
            }
        }
    });

    Ok(())
}

#[command]
pub async fn install_ollama(app_handle: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let cmd = app_handle.shell()
        .command("powershell")
        .args([
            "-WindowStyle", "Hidden",
            "-ExecutionPolicy", "Bypass", 
            "-Command", "irm https://ollama.com/install.ps1 | iex"
        ]);

    #[cfg(not(target_os = "windows"))]
    let cmd = app_handle.shell().command("sh").args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"]);

    let (mut rx, _child) = cmd.spawn().map_err(|e| e.to_string())?;
    let mut success = false;

    while let Some(event) = rx.recv().await {
        match event {
            tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                let log = String::from_utf8_lossy(&line).to_string();
                let _ = app_handle.emit("ollama-install-log", log);
            }
            tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                success = payload.code.unwrap_or(1) == 0;
            }
            _ => {}
        }
    }
    if !success { return Err("Installation failed.".into()); }
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
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let output = std::process::Command::new("where")
                    .arg("ollama")
                    .creation_flags(CREATE_NO_WINDOW)
                    .output();

                if let Ok(out) = output {
                    if out.status.success() {
                        return Ok(OllamaHealth { installed: true, running: false, version: None });
                    }
                }
            }
        }
    }
    Ok(OllamaHealth { installed: false, running: false, version: None })
}

pub fn start_engine_if_needed(app_handle: AppHandle) {
    let state = app_handle.state::<OllamaProcessState>();
    let mut lock = state.0.lock().expect("Failed to lock OllamaProcessState");
    if lock.is_some() { return; }

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("taskkill").args(["/F", "/IM", "ollama app.exe", "/T"]).creation_flags(CREATE_NO_WINDOW).output();
        let _ = std::process::Command::new("taskkill").args(["/F", "/IM", "ollama.exe", "/T"]).creation_flags(CREATE_NO_WINDOW).output();
        std::thread::sleep(std::time::Duration::from_millis(1000));
    }

    let mut cmd = std::process::Command::new("ollama");
    cmd.args(["serve"]);
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    if let Ok(child) = cmd.spawn() { *lock = Some(child); }
}
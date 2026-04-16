use serde::Serialize;
use std::sync::Mutex;
use tauri::{command, AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;

// We gebruiken std::process::Child in plaats van CommandChild voor betere controle over windows vlaggen
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
            tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                let log = String::from_utf8_lossy(&line).to_string();
                let _ = app_handle.emit("ollama-install-log", log);
            }
            tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                success = payload.code.unwrap_or(1) == 0;
            }
            tauri_plugin_shell::process::CommandEvent::Error(err) => {
                let _ = app_handle.emit("ollama-install-log", format!("Error: {}", err));
                return Err(err);
            }
            _ => {}
        }
    }

    if !success {
        return Err("Installation script failed or was blocked by the system.".to_string());
    }

    Ok(())
}


#[command]
pub async fn check_ollama_health() -> Result<OllamaHealth, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(800))
        .build()
        .unwrap();

    let response = client
        .get("http://localhost:11434/api/version")
        .send()
        .await;

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
            // FIX: Gebruik creation_flags ook bij de 'where' check om flitsen te voorkomen
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let output = std::process::Command::new("where")
                    .arg("ollama")
                    .creation_flags(CREATE_NO_WINDOW) // <-- CRACIAAL
                    .output();

                if let Ok(out) = output {
                    if out.status.success() {
                        return Ok(OllamaHealth {
                            installed: true,
                            running: false,
                            version: None,
                        });
                    }
                }
            }
            
            #[cfg(not(target_os = "windows"))]
            {
                let check_binary = std::process::Command::new("which").arg("ollama").output();
                if let Ok(output) = check_binary {
                    if output.status.success() {
                        return Ok(OllamaHealth {
                            installed: true,
                            running: false,
                            version: None,
                        });
                    }
                }
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
        
        // Zorg dat deze commando's echt CREATE_NO_WINDOW gebruiken
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

    let mut cmd = std::process::Command::new("ollama");
    cmd.args(["serve"]);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    match cmd.spawn() {
        Ok(child) => {
            tracing::info!("Managed Ollama started hidden (PID: {})", child.id());
            *lock = Some(child);
        }
        Err(e) => tracing::warn!("Failed to start: {}", e),
    }
}
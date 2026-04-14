use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, Emitter};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

pub struct OllamaProcessState(pub Mutex<Option<CommandChild>>);

pub fn start_engine_if_needed(app_handle: AppHandle) {
    let cmd = app_handle.shell().command("ollama").args(["serve"]);

    match cmd.spawn() {
        Ok((mut _rx, child)) => {
            tracing::info!("Local Ollama engine started (PID: {})", child.pid());

            // FIX: Get the state handle
            let state = app_handle.state::<OllamaProcessState>();
            
            // FIX: Lock it in a separate statement. 
            // By doing this, the temporary Result is dropped immediately,
            // and the 'lock' guard is tied clearly to this scope.
            let mut lock = state.0.lock().expect("Failed to lock OllamaProcessState");
            *lock = Some(child);
        }
        Err(e) => tracing::warn!("Failed to start Ollama engine: {}", e),
    }
}

#[command]
pub async fn install_ollama(app_handle: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let cmd = app_handle.shell().command("powershell").args(["-Command", "irm https://ollama.com/install.ps1 | iex"]);

    #[cfg(not(target_os = "windows"))]
    let cmd = app_handle.shell().command("sh").args(["-c", "curl -fsSL https://ollama.com/install.sh | sh"]);

    let (mut rx, _child) = cmd.spawn().map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let tauri_plugin_shell::process::CommandEvent::Stdout(line) = event {
                let log = String::from_utf8_lossy(&line).to_string();
                let _ = app_handle.emit("ollama-install-log", log);
            }
        }
        let _ = app_handle.emit("ollama-install-complete", true);
    });

    Ok(())
}
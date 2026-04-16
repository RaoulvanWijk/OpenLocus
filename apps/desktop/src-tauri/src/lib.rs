mod commands;
mod db;
mod models;
pub mod error;
mod logging;
mod utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = logging::init_logging() {
        eprintln!("failed to initialize logging: {error}");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(commands::ollama_manager::OllamaProcessState(
            std::sync::Mutex::new(None),
        ))
        .manage(commands::chat::LlmState::default())
        .setup(|app| {
            let version = app.package_info().version.to_string();
            tracing::info!(version = %version, "OpenLocus Started");
            let db_conn = db::open(app.handle()).map_err(|e| tauri::Error::Io(std::io::Error::other(e)))?;
            db::migrate(&db_conn).map_err(|e| tauri::Error::Io(std::io::Error::other(e)))?;

            app.manage(commands::DbState(std::sync::Mutex::new(db_conn)));

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                commands::ollama_manager::start_engine_if_needed(handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                if window.label() == "splashscreen" {
                    if let Some(main_window) = window.get_webview_window("main") {
                        if !main_window.is_visible().unwrap_or(false) {
                            std::process::exit(0);
                        }
                    }
                }
            }
            tauri::WindowEvent::Destroyed => {
                if window.label() == "main" {
                    let state = window.state::<commands::ollama_manager::OllamaProcessState>();
                    let mut lock = state.0.lock().expect("Failed to lock state during shutdown");

                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                        tracing::info!("Ollama background process terminated successfully.");
                    }

                    #[cfg(target_os = "windows")]
                    {
                        use std::os::windows::process::CommandExt;
                        const CREATE_NO_WINDOW: u32 = 0x08000000;
                        let _ = std::process::Command::new("taskkill")
                            .args(["/F", "/IM", "ollama.exe", "/T"])
                            .creation_flags(CREATE_NO_WINDOW)
                            .output();
                    }
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::document::document_create,
            commands::document::document_get,
            commands::document::document_list,
            commands::document::document_delete,
            commands::document::document_update,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::chat::chat,
            commands::chat::get_llm_status,
            commands::chat::set_llm_config,
            commands::model_db::get_models,
            commands::model_db::get_model_status,
            commands::model_db::set_model_downloaded,
            commands::ollama_manager::pull_model,
            commands::ollama_manager::list_models,
            commands::ollama_manager::install_ollama,
            commands::ollama_manager::check_ollama_health,
            commands::splash::close_splashscreen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
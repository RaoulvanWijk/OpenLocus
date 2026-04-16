mod commands;
mod db;
pub mod error;
mod logging;
mod models;
mod utils;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = logging::init_logging() {
        eprintln!("failed to initialize logging: {error}");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .manage(commands::llm_client::LlmState::default())
        .manage(commands::ollama_manager::OllamaProcessState(
            std::sync::Mutex::new(None),
        ))
        .setup(|app| {
            let version = app.package_info().version.to_string();
            tracing::info!(version = %version, "OpenLocus Started");

            let db_conn = db::open(&app.handle()).map_err(std::io::Error::other)?;
            db::migrate(&db_conn).map_err(std::io::Error::other)?;
            app.manage(commands::ai::AppState::new(db_conn));


            // FIX: Start de engine in een aparte thread zodat de splashscreen niet bevriest
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                commands::ollama_manager::start_engine_if_needed(handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                use tauri::Manager;

                if window.label() == "splashscreen" {
                    if let Some(main_window) = window.get_webview_window("main") {
                        if !main_window.is_visible().unwrap_or(false) {
                            std::process::exit(0);
                        }
                    }
                }
            }

            tauri::WindowEvent::Destroyed => {
                // FIX: Alleen Ollama killen als het hoofdvenster sluit
                if window.label() == "main" {
                    use tauri::Manager;
                    let state = window.state::<commands::ollama_manager::OllamaProcessState>();
                    let mut lock = state
                        .0
                        .lock()
                        .expect("Failed to lock state during shutdown");

                    if let Some(mut child) = lock.take() {
                        let _ = child.kill();
                        tracing::info!("Ollama background process terminated successfully.");
                    }

                    // Extra veiligheid voor Windows om alle weggelopen processen op te ruimen
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::document::document_create,
            commands::document::document_get,
            commands::document::document_list,
            commands::document::document_delete,
            commands::document::document_update,
            commands::llm_client::chat,
            commands::llm_client::get_llm_status,
            commands::llm_client::set_llm_config,
            commands::llm_client::pull_model,
            commands::llm_client::list_models,
            commands::ollama_manager::install_ollama,
            commands::ollama_manager::check_ollama_health,
            commands::splash::close_splashscreen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

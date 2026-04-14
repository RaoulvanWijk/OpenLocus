pub mod error;
mod logging;
mod commands;
mod models;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = logging::init_logging() {
        eprintln!("failed to initialize logging: {error}");
    }

    tauri::Builder::default()
        .manage(commands::llm_client::LlmState::default())
        .manage(commands::ollama_manager::OllamaProcessState(std::sync::Mutex::new(None)))
        
        .setup(|app| {
            let version = app.package_info().version.to_string();
            tracing::info!(version = %version, "OpenLocus Started");

            commands::ollama_manager::start_engine_if_needed(app.handle().clone());

            Ok(())
        })
        
        .on_window_event(|window, event| match event {
                    tauri::WindowEvent::Destroyed => {
                        use tauri::Manager;
                        let state = window.state::<commands::ollama_manager::OllamaProcessState>();
                        
                        // Step-by-step to avoid the same lifetime error
                        let mut lock = state.0.lock().expect("Failed to lock state during shutdown");
                        let child_to_kill = lock.take(); 
                        
                        if let Some(child) = child_to_kill {
                            let _ = child.kill();
                            tracing::info!("Ollama background process terminated successfully.");
                        }
                    }
                    _ => {}
                })
        
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
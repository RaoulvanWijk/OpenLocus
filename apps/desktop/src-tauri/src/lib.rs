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
        .setup(|app| {
            let version = app.package_info().version.to_string();
            tracing::info!(version = %version, "OpenLocus Started");
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .manage(commands::ai::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::document::document_create,
            commands::document::document_get,
            commands::document::document_list,
            commands::document::document_delete,
            commands::document::document_update,
            commands::ai::get_model_status,
            commands::ai::download_model,
            commands::ai::load_model,
            commands::ai::chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
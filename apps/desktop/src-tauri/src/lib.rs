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
        .setup(|app| {
            let version = app.package_info().version.to_string();
            tracing::info!(version = %version, "OpenLocus Started");

            let db_conn = db::open(&app.handle()).map_err(std::io::Error::other)?;
            db::migrate(&db_conn).map_err(std::io::Error::other)?;
            app.manage(commands::ai::AppState::new(db_conn));

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::document::document_create,
            commands::document::document_get,
            commands::document::document_list,
            commands::document::document_delete,
            commands::document::document_update,
            commands::ai::get_model_status,
            commands::ai::download_model,
            commands::ai::load_model,
            commands::ai::chat,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::models::models_list,
            commands::models::model_set_downloaded
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

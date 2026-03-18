pub mod error;
mod logging;
mod commands;

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
        .invoke_handler(tauri::generate_handler![
            commands::document::create_document,
            commands::document::list_documents,
            commands::document::delete_document,
            commands::document::get_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

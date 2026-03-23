mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(commands::ai::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::document::create_document,
            commands::document::list_documents,
            commands::document::delete_document,
            commands::document::get_note,
            commands::ai::get_model_status,
            commands::ai::download_model,
            commands::ai::load_model,
            commands::ai::chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
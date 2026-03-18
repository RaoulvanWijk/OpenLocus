mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::document::create_document,
            commands::document::list_documents,
            commands::document::delete_document,
            commands::document::get_note,
            commands::ai::download_model,
            commands::ai::check_model_exists,
            commands::ai::run_inference
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

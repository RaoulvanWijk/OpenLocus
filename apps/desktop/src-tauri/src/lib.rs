mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::document::create_document,
            commands::document::list_documents,
            commands::document::delete_document,
            commands::document::get_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

mod llm;

use llm::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            llm::get_model_status,
            llm::download_model,
            llm::load_model,
            llm::chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

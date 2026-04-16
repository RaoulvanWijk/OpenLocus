use tauri::{command, Manager, Window};

#[command]
pub async fn close_splashscreen(window: Window) -> Result<(), String> {
    // Zoek het hoofdvenster, maak het zichtbaar en geef het focus
    if let Some(main_window) = window.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }

    // Sluit dit laadscherm
    window.close().map_err(|e| e.to_string())?;
    Ok(())
}

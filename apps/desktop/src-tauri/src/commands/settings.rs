use rusqlite::{params, OptionalExtension};
use tauri::State;

use super::ai::AppState;

#[tauri::command]
pub fn settings_get(key: String, state: State<AppState>) -> Result<Option<String>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn settings_set(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    conn.execute(
        "
        INSERT INTO settings (key, value)
        VALUES (?1, ?2)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
        ",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

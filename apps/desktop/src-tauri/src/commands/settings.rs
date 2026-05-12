use rusqlite::{params, OptionalExtension};
use tauri::State;
use crate::commands::DbState;

#[tauri::command]
pub fn settings_get(key: String, state: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = state
        .0
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row: &rusqlite::Row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e: rusqlite::Error| e.to_string())
}

#[tauri::command]
pub fn settings_set(key: String, value: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state
        .0
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
    .map_err(|e: rusqlite::Error| e.to_string())?;

    Ok(())
}
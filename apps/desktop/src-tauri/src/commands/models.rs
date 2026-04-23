use rusqlite::{params, Connection};
use tauri::State;

use super::ai::AppState;

#[derive(serde::Serialize, Clone)]
pub struct ModelRow {
    pub id: String,
    pub name: String,
    pub downloaded: bool,
}

pub(crate) fn model_set_downloaded_with_conn(
    conn: &Connection,
    id: &str,
    downloaded: bool,
) -> Result<(), String> {
    let rows_affected = conn
        .execute(
            "UPDATE models SET downloaded = ?2 WHERE id = ?1",
            params![id, if downloaded { 1 } else { 0 }],
        )
        .map_err(|e| e.to_string())?;

    if rows_affected == 0 {
        return Err(format!("Unknown model id: {id}"));
    }

    Ok(())
}

pub(crate) fn model_downloaded_with_conn(conn: &Connection, id: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT downloaded FROM models WHERE id = ?1",
        params![id],
        |row| row.get::<_, i64>(0),
    )
    .map(|downloaded| downloaded != 0)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn models_list(state: State<AppState>) -> Result<Vec<ModelRow>, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, downloaded FROM models ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ModelRow {
                id: row.get::<_, String>(0)?,
                name: row.get::<_, String>(1)?,
                downloaded: row.get::<_, i64>(2)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;

    let models = rows
        .collect::<Result<Vec<ModelRow>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(models)
}

#[tauri::command]
pub fn model_set_downloaded(
    id: String,
    downloaded: bool,
    state: State<AppState>,
) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    model_set_downloaded_with_conn(&conn, &id, downloaded)
}

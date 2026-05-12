use rusqlite::OptionalExtension;
use serde::Serialize;
use tauri::{command, State};
use crate::commands::DbState;

#[derive(Serialize)]
pub struct ModelRow {
    pub id: String,
    pub ollama_id: String,
    pub name: String,
    pub description: String,
    pub size_gb: String,
    pub downloaded: bool,
}

#[derive(Serialize)]
pub struct ModelStatus {
    pub downloaded: bool,
    pub loaded: bool,
}

// Haalt de hele lijst met aanbevolen modellen uit je SQLite DB
#[command]
pub fn get_models(state: State<'_, DbState>) -> Result<Vec<ModelRow>, String> {
    let conn = state.0.lock().map_err(|_| "DB Lock failed")?;
    let mut stmt = conn
        .prepare("SELECT id, ollama_id, name, description, size_gb, downloaded FROM models")
        .map_err(|e| e.to_string())?;

    let models = stmt
        .query_map([], |row| {
            Ok(ModelRow {
                id: row.get(0)?,
                ollama_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                size_gb: row.get(4)?,
                // SQLite slaat booleans op als 0 of 1
                downloaded: row.get::<_, i32>(5)? == 1,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(models)
}

// Checkt voor één specifiek model of het gedownload is in de DB
#[command]
pub fn get_model_status(model_id: String, state: State<'_, DbState>) -> Result<ModelStatus, String> {
    let conn = state.0.lock().map_err(|_| "DB Lock failed")?;
    
    let downloaded: Option<i32> = conn
        .query_row(
            "SELECT downloaded FROM models WHERE id = ?1",
            [&model_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(ModelStatus {
        downloaded: downloaded.unwrap_or(0) == 1,
        loaded: false, // Voor Ollama is dit niet meer hard nodig in de UI
    })
}

// Nieuw: markeert het model als 'gedownload' als Ollama klaar is met pullen
#[command]
pub fn set_model_downloaded(model_id: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "DB Lock failed")?;
    conn.execute(
        "UPDATE models SET downloaded = 1 WHERE id = ?1",
        [&model_id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}
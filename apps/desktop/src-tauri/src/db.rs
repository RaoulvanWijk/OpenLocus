use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};

#[derive(Clone, Copy)]
pub struct KnownModel {
    pub id: &'static str,
    pub name: &'static str,
    pub file_name: &'static str,
    pub download_url: &'static str,
}

pub const KNOWN_MODELS: [KnownModel; 3] = [
    KnownModel {
        id: "ministral-3b",
        name: "Ministral 3B",
        file_name: "ministral-3b-q4_k_m.gguf",
        download_url: "https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-GGUF/resolve/main/Ministral-3-3B-Instruct-2512-Q4_K_M.gguf",
    },
    KnownModel {
        id: "llama-3.3-8b",
        name: "Llama 3.3 8B",
        file_name: "llama-3.3-8b-q4_k_m.gguf",
        download_url: "https://huggingface.co/bartowski/Llama-3.3-8B-Instruct-GGUF/resolve/main/Llama-3.3-8B-Instruct-Q4_K_M.gguf",
    },
    KnownModel {
        id: "phi-4-15b",
        name: "Phi-4 15B",
        file_name: "phi-4-15b-q4_k_m.gguf",
        download_url: "https://huggingface.co/bartowski/Phi-4-GGUF/resolve/main/Phi-4-Q4_K_M.gguf",
    },
];

pub fn known_model_by_id(model_id: &str) -> Option<KnownModel> {
    KNOWN_MODELS
        .iter()
        .copied()
        .find(|model| model.id == model_id)
}

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("openlocus.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", 1)
        .map_err(|e| e.to_string())?;

    Ok(conn)
}

pub fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS migrations (
            version    INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS models (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            downloaded INTEGER NOT NULL DEFAULT 0
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    let migration_applied = conn
        .query_row("SELECT 1 FROM migrations WHERE version = 1", [], |_| Ok(()))
        .optional()
        .map_err(|e| e.to_string())?
        .is_some();

    if migration_applied {
        return Ok(());
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for model in KNOWN_MODELS {
        tx.execute(
            "
            INSERT OR IGNORE INTO models (id, name, downloaded)
            VALUES (?1, ?2, 0)
            ",
            params![model.id, model.name],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.execute(
        "INSERT INTO migrations (version, applied_at) VALUES (?1, datetime('now'))",
        params![1],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

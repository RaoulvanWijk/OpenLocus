use rusqlite::{params, Connection, OptionalExtension};
use tauri::{AppHandle, Manager};

#[derive(Clone, Copy)]
pub struct KnownModel {
    pub id: &'static str,       
    pub ollama_id: &'static str,  
    pub name: &'static str,       
    pub description: &'static str, 
    pub size_gb: &'static str,     
}

pub const KNOWN_MODELS: [KnownModel; 3] = [
    KnownModel {
        id: "ministral-3b",
        ollama_id: "ministral-3:3b",
        name: "Ministral 3B",
        description: "Small but powerful for everyday tasks.",
        size_gb: "2.1GB",
    },
    KnownModel {
        id: "llama-3.1-8b",
        ollama_id: "llama3.1:8b",
        name: "Llama 3.1 8B",
        description: "Meta's balanced model, optimized for speed and logic.",
        size_gb: "4.9GB",
    },
    KnownModel {
        id: "phi-4",
        ollama_id: "phi4:latest",
        name: "Phi-4 14B",
        description: "Microsoft's high-end reasoning model.",
        size_gb: "9.1GB",
    },
];

pub fn open(app: &AppHandle) -> Result<Connection, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("openlocus.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", 1).map_err(|e| e.to_string())?;

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
            id           TEXT PRIMARY KEY,
            ollama_id    TEXT NOT NULL,
            name         TEXT NOT NULL,
            description  TEXT,
            size_gb      TEXT,
            downloaded   INTEGER NOT NULL DEFAULT 0
        );
        ",
    )
    .map_err(|e| e.to_string())?;

    let v1_applied = conn
        .query_row("SELECT 1 FROM migrations WHERE version = 1", [], |_| Ok(()))
        .optional()
        .map_err(|e| e.to_string())?
        .is_some();

    if !v1_applied {
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        for model in KNOWN_MODELS {
            tx.execute(
                "
                INSERT OR IGNORE INTO models (id, ollama_id, name, description, size_gb, downloaded)
                VALUES (?1, ?2, ?3, ?4, ?5, 0)
                ",
                params![model.id, model.ollama_id, model.name, model.description, model.size_gb],
            )
            .map_err(|e| e.to_string())?;
        }

        tx.execute(
            "INSERT INTO migrations (version, applied_at) VALUES (?1, datetime('now'))",
            params![1],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
    }

    let v2_applied = conn
        .query_row("SELECT 1 FROM migrations WHERE version = 2", [], |_| Ok(()))
        .optional()
        .map_err(|e| e.to_string())?
        .is_some();

    if !v2_applied {
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

        tx.execute(
            "ALTER TABLE models ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0",
            [],
        )
        .map_err(|e| e.to_string())?;
        tx.execute("ALTER TABLE models ADD COLUMN file_path TEXT", [])
            .map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO migrations (version, applied_at) VALUES (?1, datetime('now'))",
            params![2],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
    }

    Ok(())
}
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use sysinfo::System;
use tauri::{command, AppHandle, Manager, State};
use uuid::Uuid;

use crate::commands::ollama_manager::{pull_model, ActiveDownloads};
use crate::commands::DbState;

const MAX_NAME_LEN: usize = 64;
const OLLAMA_TAG_REGEX_HINT: &str = "lowercase letters, digits, '.', '_', '-' and one optional ':<tag>' suffix";

#[derive(Serialize)]
pub struct ModelRow {
    pub id: String,
    pub ollama_id: String,
    pub name: String,
    pub description: String,
    pub size_gb: String,
    pub downloaded: bool,
    pub is_custom: bool,
    pub file_path: Option<String>,
}

#[derive(Serialize)]
pub struct ModelStatus {
    pub downloaded: bool,
    pub loaded: bool,
}

#[derive(Deserialize)]
#[serde(tag = "source_type", rename_all = "snake_case")]
pub enum CustomModelSource {
    Gguf { file_path: String },
    Ollama { tag: String },
}

#[command]
pub fn get_models(state: State<'_, DbState>) -> Result<Vec<ModelRow>, String> {
    let conn = state.0.lock().map_err(|_| "DB Lock failed")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, ollama_id, name, description, size_gb, downloaded, is_custom, file_path FROM models",
        )
        .map_err(|e| e.to_string())?;

    let models = stmt
        .query_map([], |row| {
            Ok(ModelRow {
                id: row.get(0)?,
                ollama_id: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                size_gb: row.get(4)?,
                downloaded: row.get::<_, i32>(5)? == 1,
                is_custom: row.get::<_, i32>(6)? == 1,
                file_path: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(models)
}

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
        loaded: false,
    })
}

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

#[command]
pub fn verify_custom_models(state: State<'_, DbState>) -> Result<Vec<String>, String> {
    let conn = state.0.lock().map_err(|_| "DB Lock failed")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, file_path FROM models WHERE is_custom = 1 AND file_path IS NOT NULL AND downloaded = 1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut missing: Vec<String> = Vec::new();
    for (id, file_path) in rows {
        if let Some(path) = file_path {
            if std::fs::metadata(&path).is_err() {
                conn.execute(
                    "UPDATE models SET downloaded = 0 WHERE id = ?1",
                    [&id],
                )
                .map_err(|e| e.to_string())?;
                missing.push(id);
            }
        }
    }

    Ok(missing)
}

#[command]
pub async fn add_custom_model(
    app: AppHandle,
    name: String,
    source: CustomModelSource,
    downloads: State<'_, ActiveDownloads>,
) -> Result<ModelRow, String> {
    let trimmed_name = name.trim().to_string();
    if trimmed_name.is_empty() {
        return Err("Give your model a display name.".into());
    }
    if trimmed_name.chars().count() > MAX_NAME_LEN {
        return Err("Name must be 64 characters or fewer.".into());
    }

    {
        let db_state = app
            .try_state::<DbState>()
            .ok_or_else(|| "Database not initialised".to_string())?;
        let conn = db_state.0.lock().map_err(|_| "DB Lock failed")?;
        let exists: Option<i32> = conn
            .query_row(
                "SELECT 1 FROM models WHERE name = ?1",
                [&trimmed_name],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if exists.is_some() {
            return Err("A model with this name already exists.".into());
        }
    }

    let id = format!("custom-{}", Uuid::new_v4());

    match source {
        CustomModelSource::Gguf { file_path } => {
            let abs_path = validate_gguf(&file_path)?;
            ollama_create_from_gguf(&app, &id, &abs_path).await?;

            let size_gb = format_size_gb(std::fs::metadata(&abs_path).map(|m| m.len()).unwrap_or(0));
            let row = ModelRow {
                id: id.clone(),
                ollama_id: id.clone(),
                name: trimmed_name.clone(),
                description: "Custom local GGUF model.".into(),
                size_gb,
                downloaded: true,
                is_custom: true,
                file_path: Some(abs_path.to_string_lossy().to_string()),
            };

            insert_custom_row(&app, &row)?;
            Ok(row)
        }
        CustomModelSource::Ollama { tag } => {
            validate_ollama_tag(&tag)?;

            let row = ModelRow {
                id: id.clone(),
                ollama_id: tag.clone(),
                name: trimmed_name.clone(),
                description: "Custom Ollama library model.".into(),
                size_gb: String::new(),
                downloaded: false,
                is_custom: true,
                file_path: None,
            };

            insert_custom_row(&app, &row)?;

            pull_model(app.clone(), downloads, id.clone(), tag.clone()).await?;

            Ok(row)
        }
    }
}

#[command]
pub async fn remove_custom_model(
    app: AppHandle,
    model_id: String,
) -> Result<(), String> {
    let ollama_id: Option<String> = {
        let db_state = app
            .try_state::<DbState>()
            .ok_or_else(|| "Database not initialised".to_string())?;
        let conn = db_state.0.lock().map_err(|_| "DB Lock failed")?;
        let row: Option<String> = conn
            .query_row(
                "SELECT ollama_id FROM models WHERE id = ?1 AND is_custom = 1",
                [&model_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        if row.is_none() {
            return Err("Custom model not found.".into());
        }

        conn.execute(
            "DELETE FROM models WHERE id = ?1 AND is_custom = 1",
            [&model_id],
        )
        .map_err(|e| e.to_string())?;

        row
    };

    if let Some(tag) = ollama_id {
        let _ = run_ollama_command(&app, &["rm", &tag]).await;
    }

    Ok(())
}

fn insert_custom_row(app: &AppHandle, row: &ModelRow) -> Result<(), String> {
    let db_state = app
        .try_state::<DbState>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let conn = db_state.0.lock().map_err(|_| "DB Lock failed")?;
    conn.execute(
        "INSERT INTO models (id, ollama_id, name, description, size_gb, downloaded, is_custom, file_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
        params![
            row.id,
            row.ollama_id,
            row.name,
            row.description,
            row.size_gb,
            if row.downloaded { 1 } else { 0 },
            row.file_path,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_gguf(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);

    let ext_ok = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("gguf"))
        .unwrap_or(false);
    if !ext_ok {
        return Err("File must have a .gguf extension.".into());
    }

    let metadata = std::fs::metadata(&path).map_err(|_| "File not found on disk.".to_string())?;
    let size = metadata.len();

    // Magic bytes check.
    use std::io::Read;
    let mut file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut buf = [0u8; 4];
    file.read_exact(&mut buf)
        .map_err(|_| "This file is not a valid GGUF model.".to_string())?;
    if &buf != b"GGUF" {
        return Err("This file is not a valid GGUF model.".into());
    }

    // RAM headroom check (best-effort).
    let mut sys = System::new_all();
    sys.refresh_memory();
    let total_ram_bytes = sys.total_memory();
    if total_ram_bytes > 0 && size as f64 > (total_ram_bytes as f64) * 0.9 {
        return Err("This model is likely too large for your system's available memory.".into());
    }

    Ok(path)
}

fn validate_ollama_tag(tag: &str) -> Result<(), String> {
    let trimmed = tag.trim();
    if trimmed.is_empty() {
        return Err("Enter an Ollama model tag (e.g. mistral:7b).".into());
    }

    let mut split = trimmed.splitn(2, ':');
    let name = split.next().unwrap_or("");
    let version = split.next();

    if name.is_empty() || !is_ollama_segment(name) {
        return Err(format!(
            "Tag format looks invalid. Expected {OLLAMA_TAG_REGEX_HINT}."
        ));
    }
    if let Some(v) = version {
        if v.is_empty() || !is_ollama_segment(v) {
            return Err(format!(
                "Tag format looks invalid. Expected {OLLAMA_TAG_REGEX_HINT}."
            ));
        }
    }
    Ok(())
}

fn is_ollama_segment(s: &str) -> bool {
    s.chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '.' || c == '_' || c == '-')
}

fn format_size_gb(size_bytes: u64) -> String {
    if size_bytes == 0 {
        return String::new();
    }
    let gb = (size_bytes as f64) / 1024_f64.powi(3);
    format!("{gb:.1}GB")
}

async fn ollama_create_from_gguf(app: &AppHandle, model_id: &str, gguf_path: &PathBuf) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let modelfile_path = app_data_dir.join(format!("{model_id}.Modelfile"));
    let modelfile_contents = format!("FROM {}\n", gguf_path.to_string_lossy());
    std::fs::write(&modelfile_path, modelfile_contents).map_err(|e| e.to_string())?;

    let modelfile_str = modelfile_path.to_string_lossy().to_string();

    match run_ollama_command(app, &["create", model_id, "-f", &modelfile_str]).await {
        Ok(_) => {
            let _ = std::fs::remove_file(&modelfile_path);
            Ok(())
        }
        Err(stderr) => {
            let _ = std::fs::remove_file(&modelfile_path);
            let last = stderr
                .lines()
                .rev()
                .find(|line| !line.trim().is_empty())
                .map(|s| s.trim().to_string())
                .unwrap_or_else(|| "unknown error".into());
            Err(format!("Ollama refused the model: {last}"))
        }
    }
}

async fn run_ollama_command(app: &AppHandle, args: &[&str]) -> Result<String, String> {
    use tauri_plugin_shell::ShellExt;

    let cmd = app.shell().command("ollama").args(args);
    let (mut rx, _child) = cmd
        .spawn()
        .map_err(|e| format!("Failed to launch ollama: {e}"))?;

    let mut stdout = String::new();
    let mut stderr = String::new();
    let mut success = false;

    while let Some(event) = rx.recv().await {
        match event {
            tauri_plugin_shell::process::CommandEvent::Stdout(bytes) => {
                stdout.push_str(&String::from_utf8_lossy(&bytes));
            }
            tauri_plugin_shell::process::CommandEvent::Stderr(bytes) => {
                stderr.push_str(&String::from_utf8_lossy(&bytes));
            }
            tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                success = payload.code.unwrap_or(1) == 0;
            }
            _ => {}
        }
    }

    if success {
        Ok(stdout)
    } else {
        Err(if stderr.trim().is_empty() { stdout } else { stderr })
    }
}

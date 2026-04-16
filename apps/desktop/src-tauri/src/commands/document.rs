use chrono::Utc;
use std::fs;
use tracing::debug;
use uuid::Uuid;

use crate::error::{log_contract_error, map_io_error, AppError, Result as AppResult};
use crate::models::document::{CreateDocumentResult, DocumentContent, DocumentMeta};
use crate::utils::{
    fs::openlocus_dir,
    markdown::{get_document_path, read_document_meta},
};

#[tauri::command]
pub fn document_create(path: String, title: Option<String>) -> AppResult<CreateDocumentResult> {
    let id = Uuid::new_v4().to_string();
    let title = title.unwrap_or_default();
    let now = Utc::now().to_rfc3339();

    let file_path = openlocus_dir()?.join(path);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| map_io_error("document_create", "create_dir_all", e))?;
    }

    let heading = if title.is_empty() {
        String::new()
    } else {
        format!("\n# {title}\n")
    };
    let content = format!(
        "---\nid: \"{id}\"\ntitle: \"{title}\"\ncreated_at: \"{now}\"\n---\n{}",
        heading
    );

    fs::write(&file_path, content).map_err(|e| map_io_error("document_create", "write", e))?;

    debug!(command = "document_create", id = %id, "Document created");

    Ok(CreateDocumentResult {
        id,
        path: file_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn document_get(id: String) -> AppResult<DocumentContent> {
    let path = get_document_path(&id, "document_get")?;
    let raw =
        fs::read_to_string(&path).map_err(|e| map_io_error("document_get", "read_to_string", e))?;
    let meta = read_document_meta(&path).ok_or_else(|| {
        let app_error = AppError::Internal("Failed to parse document metadata".to_string());
        log_contract_error("document_get", "read_document_meta", &app_error);
        app_error
    })?;

    let body = raw.split("---").nth(2).unwrap_or("").trim().to_string();

    Ok(DocumentContent {
        id: meta.id,
        title: meta.title,
        created_at: meta.created_at,
        updated_at: meta.updated_at,
        content: body,
    })
}

#[tauri::command]
pub fn document_list() -> AppResult<Vec<DocumentMeta>> {
    let dir = openlocus_dir()?;
    fs::create_dir_all(&dir).map_err(|e| map_io_error("document_list", "create_dir_all", e))?;

    let mut docs: Vec<DocumentMeta> = fs::read_dir(&dir)
        .map_err(|e| map_io_error("document_list", "read_dir", e))?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                read_document_meta(&path)
            } else {
                None
            }
        })
        .collect();

    docs.sort_by(|a, b| {
        let a_time = if a.updated_at.is_empty() {
            &a.created_at
        } else {
            &a.updated_at
        };
        let b_time = if b.updated_at.is_empty() {
            &b.created_at
        } else {
            &b.updated_at
        };
        b_time.cmp(a_time)
    });

    Ok(docs)
}

#[tauri::command]
pub fn document_update(id: String, content: String, title: String) -> AppResult<()> {
    let path = get_document_path(&id, "document_update")?;
    let meta = read_document_meta(&path).ok_or_else(|| {
        let app_error = AppError::Internal("Failed to parse document metadata".to_string());
        log_contract_error("document_update", "read_document_meta", &app_error);
        app_error
    })?;
    let now = Utc::now().to_rfc3339();
    let new_content = format!(
        "---\nid: \"{}\"\ntitle: \"{}\"\ncreated_at: \"{}\"\nupdated_at: \"{}\"\n---\n{}",
        meta.id, title, meta.created_at, now, content
    );
    fs::write(&path, new_content).map_err(|e| map_io_error("document_update", "write", e))?;
    debug!(command = "document_update", id = %id, "Document updated");
    Ok(())
}

#[tauri::command]
pub fn document_delete(id: String) -> AppResult<()> {
    let path = get_document_path(&id, "document_delete")?;
    fs::remove_file(path).map_err(|e| map_io_error("document_delete", "remove_file", e))
}

use std::{fs, io, io::BufRead, path::PathBuf};
use tracing::warn;

use crate::error::{log_contract_error, map_io_error, AppError, Result as AppResult};
use crate::models::document::DocumentMeta;

/// Parses a simple YAML frontmatter block (between `---` delimiters) and extracts
/// the value for a given key, e.g. `id: "abc"` → `"abc"`.
fn parse_frontmatter_field(frontmatter: &str, key: &str) -> Option<String> {
    for line in frontmatter.lines() {
        if let Some(rest) = line.strip_prefix(&format!("{key}:")) {
            return Some(rest.trim().trim_matches('"').to_string());
        }
    }

    None
}

/// Read only the YAML frontmatter block from the top of the file.
/// Expects a leading line with `---` and reads until the next `---` line.
fn read_frontmatter(path: &PathBuf) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut reader = io::BufReader::new(file);

    let mut line = String::new();

    reader.read_line(&mut line).ok()?;
    if line.trim_end() != "---" {
        return None;
    }

    let mut frontmatter = String::new();
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line).ok()?;
        if bytes_read == 0 {
            break;
        }

        if line.trim_end() == "---" {
            break;
        }

        frontmatter.push_str(&line);
    }

    Some(frontmatter)
}

pub fn read_document_meta(path: &PathBuf) -> Option<DocumentMeta> {
    let frontmatter = read_frontmatter(path)?;

    let id = parse_frontmatter_field(&frontmatter, "id")?;
    let title = parse_frontmatter_field(&frontmatter, "title").unwrap_or_default();
    let created_at = parse_frontmatter_field(&frontmatter, "created_at").unwrap_or_default();

    Some(DocumentMeta {
        id,
        title,
        created_at,
        path: path.to_string_lossy().to_string(),
    })
}

pub fn get_document_path(id: &str, command: &str) -> AppResult<PathBuf> {
    let dir = super::fs::openlocus_dir()?;

    fs::create_dir_all(&dir).map_err(|e| map_io_error(command, "create_dir_all", e))?;

    fs::read_dir(&dir)
        .map_err(|e| map_io_error(command, "read_dir", e))?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                let meta = read_document_meta(&path)?;
                if meta.id == id {
                    Some(path)
                } else {
                    None
                }
            } else {
                None
            }
        })
        .next()
        .ok_or_else(|| {
            let app_error = AppError::Internal(format!("Document with id '{id}' not found"));
            warn!(command, id, "Document not found");
            log_contract_error(command, "lookup_document_by_id", &app_error);
            app_error
        })
}

use chrono::Utc;
use std::{fs, path::PathBuf};
use uuid::Uuid;

#[derive(serde::Serialize)]
pub struct CreateDocumentResult {
    pub id: String,
    pub path: String,
}

#[derive(serde::Serialize)]
pub struct DocumentMeta {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub path: String,
}

fn openlocus_dir() -> Result<PathBuf, String> {
    Ok(dirs_next::home_dir()
        .ok_or("Could not resolve home directory")?
        .join("OpenLocus"))
}

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

fn read_document_meta(path: &PathBuf) -> Option<DocumentMeta> {
    let content = fs::read_to_string(path).ok()?;

    // Frontmatter must start at the very beginning with `---`
    let rest = content.strip_prefix("---\n")?;
    let end = rest.find("\n---")?;
    let frontmatter = &rest[..end];

    let id = parse_frontmatter_field(frontmatter, "id")?;
    let title = parse_frontmatter_field(frontmatter, "title").unwrap_or_else(|| "Untitled".into());
    let created_at = parse_frontmatter_field(frontmatter, "created_at").unwrap_or_default();

    Some(DocumentMeta {
        id,
        title,
        created_at,
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn list_documents() -> Result<Vec<DocumentMeta>, String> {
    let dir = openlocus_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut docs: Vec<DocumentMeta> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension()?.to_str()? == "md" {
                read_document_meta(&path)
            } else {
                None
            }
        })
        .collect();

    docs.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(docs)
}

#[tauri::command]
pub fn delete_document(id: String) -> Result<(), String> {
    let dir = openlocus_dir()?;

    let path = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            if path.extension()?.to_str()? == "md" {
                let meta = read_document_meta(&path)?;
                if meta.id == id { Some(path) } else { None }
            } else {
                None
            }
        })
        .next()
        .ok_or_else(|| format!("Document with id '{id}' not found"))?;

    fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_document(
    path: String,
    title: Option<String>,
) -> Result<CreateDocumentResult, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = title.unwrap_or_else(|| "Untitled".to_string());

    let file_path: PathBuf = if PathBuf::from(&path).is_absolute() {
        PathBuf::from(&path)
    } else {
        openlocus_dir()?.join(&path)
    };

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let content = format!(
        "---\nid: \"{id}\"\ntitle: \"{title}\"\ncreated_at: \"{now}\"\n---\n\n# {title}\n"
    );

    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(CreateDocumentResult {
        id,
        path: file_path.to_string_lossy().to_string(),
    })
}

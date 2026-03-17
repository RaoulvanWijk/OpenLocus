use chrono::Utc;
use std::{fs, io, io::BufRead, path::PathBuf};
use uuid::Uuid;
use serde_yaml;

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

#[derive(serde::Serialize)]
struct Frontmatter<'a> {
    id: &'a str,
    title: &'a str,
    created_at: &'a str,
}

#[derive(serde::Serialize)]
pub struct DocumentContent {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub content: String,
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

/// Read only the YAML frontmatter block from the top of the file.
/// Expects a leading line with `---` and reads until the next `---` line.
fn read_frontmatter(path: &PathBuf) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut reader = io::BufReader::new(file);

    let mut line = String::new();

    // First line must be the opening frontmatter delimiter.
    reader.read_line(&mut line).ok()?;
    if line.trim_end() != "---" {
        return None;
    }

    let mut frontmatter = String::new();
    loop {
        line.clear();
        let bytes_read = reader.read_line(&mut line).ok()?;
        if bytes_read == 0 {
            // EOF reached before closing delimiter.
            break;
        }

        if line.trim_end() == "---" {
            // Closing delimiter reached; stop reading.
            break;
        }

        frontmatter.push_str(&line);
    }

    Some(frontmatter)
}

fn read_document_meta(path: &PathBuf) -> Option<DocumentMeta> {
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
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

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
pub fn get_note(id: String) -> Result<DocumentContent, String> {
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

    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let meta = read_document_meta(&path)
        .ok_or_else(|| "Failed to parse document metadata".to_string())?;

    // Extract body after the closing `---`
    let body = raw
        .strip_prefix("---\n")
        .and_then(|rest| rest.find("\n---").map(|end| &rest[end + 4..]))
        .unwrap_or("")
        .trim()
        .to_string();

    Ok(DocumentContent {
        id: meta.id,
        title: meta.title,
        created_at: meta.created_at,
        content: body,
    })
}

#[tauri::command]
pub fn create_document(
    path: String,
    title: Option<String>,
) -> Result<CreateDocumentResult, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let title = title.unwrap_or_default();

    let file_path: PathBuf = if PathBuf::from(&path).is_absolute() {
        PathBuf::from(&path)
    } else {
        openlocus_dir()?.join(&path)
    };

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let heading = if title.is_empty() {
        String::new()
    } else {
        format!("\n# {title}\n")
    };

    let frontmatter = Frontmatter {
        id: &id,
        title: &title,
        created_at: &now,
    };

    let yaml = serde_yaml::to_string(&frontmatter).map_err(|e| e.to_string())?;

    let content = format!("---\n{}---\n{}", yaml, heading);

    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(CreateDocumentResult {
        id,
        path: file_path.to_string_lossy().to_string(),
    })
}

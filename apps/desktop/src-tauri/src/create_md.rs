use std::fs::File;
use std::io::Write;
use std::path::Path;
use uuid::Uuid;

#[tauri::command]
pub fn create_markdown() -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let folder = "markdown";

    let filename = format!("{}/{}.md", folder, id);

    let content = format!("# Nieuw Markdown Bestand\nID: {}", id);

    let path = Path::new(&filename);

    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;

    Ok(filename)
}
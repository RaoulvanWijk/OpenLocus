// cargo run --bin create_md 
use std::fs::File;
use std::io::Write;
use std::path::Path;
use uuid::Uuid;

fn main() {
    create_markdown();
}

fn create_markdown() {
    // Random ID genereren
    let id = Uuid::new_v4().to_string();

    // Opslagmap
    let folder = "markdown";

    // Bestandsnaam
    let filename = format!("{}/{}.md", folder, id);

    // Inhoud
    let content = format!("# Nieuw Markdown Bestand\nID: {}", id);

    // Pad maken
    let path = Path::new(&filename);

    // Bestand schrijven
    let mut file = File::create(path).expect("Kon bestand niet maken");
    file.write_all(content.as_bytes()).expect("Kon niet schrijven");

    println!("Markdown bestand aangemaakt: {}", filename);
}
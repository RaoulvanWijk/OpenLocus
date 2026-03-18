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
pub struct DocumentContent {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub content: String,
}

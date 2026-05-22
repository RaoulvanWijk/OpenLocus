#[derive(serde::Serialize)]
pub struct SystemInfoResult {
    pub logical_cores: usize,
    pub physical_cores: usize,
    pub total_memory_gib: f64,
    pub available_memory_gib: f64,
    pub recommendation: Option<String>,
}
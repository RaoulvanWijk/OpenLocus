use serde::{Serialize};
use tauri::{command, State};
use tokio::sync::RwLock;

// ── Config & State ────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct LlmConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            base_url: "http://localhost:11434/v1".to_string(),
            api_key: None,
            model: "llama3.2".to_string(),
        }
    }
}

pub struct LlmState(pub RwLock<LlmConfig>);

impl Default for LlmState {
    fn default() -> Self {
        Self(RwLock::new(LlmConfig::default()))
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct LlmStatus {
    pub available: bool,
    pub base_url: String,
    pub model: String,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[command]
pub async fn set_llm_config(
    state: State<'_, LlmState>,
    base_url: String,
    model: String,
    api_key: Option<String>,
) -> Result<(), String> {
    let mut config = state.0.write().await;
    config.base_url = base_url;
    config.model = model;
    config.api_key = api_key;
    Ok(())
}

#[command]
pub async fn get_llm_status(state: State<'_, LlmState>) -> Result<LlmStatus, String> {
    let config = state.0.read().await;
    let client = reqwest::Client::new();

    tracing::debug!(
        event = "status_check",
        base_url = %config.base_url,
        model = %config.model,
    );

    let available = client
        .get(format!("{}/models", config.base_url.replace("/v1", "")))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    tracing::debug!(
        event = "status_result",
        available,
        model = %config.model,
    );

    Ok(LlmStatus {
        available,
        base_url: config.base_url.clone(),
        model: config.model.clone(),
    })
}
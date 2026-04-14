use serde::{Deserialize, Serialize};
use tauri::{command, State, AppHandle, Emitter};
use tokio::sync::RwLock;

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
            model: "mistral".to_string(),
        }
    }
}

pub struct LlmState(pub RwLock<LlmConfig>);

impl Default for LlmState {
    fn default() -> Self {
        Self(RwLock::new(LlmConfig::default()))
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct ChatInput {
    pub document_context: Option<String>,
    pub chat_history: Vec<Message>,
    pub user_message: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: Message,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Serialize)]
pub struct LlmStatus {
    pub available: bool,
    pub base_url: String,
    pub model: String,
}

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
pub async fn chat(
    state: State<'_, LlmState>,
    input: ChatInput,
) -> Result<String, String> {
    let config = state.0.read().await;
    let client = reqwest::Client::new();

    let mut messages: Vec<Message> = Vec::new();
    let mut system_prompt = String::from("You are the AI assistant for OpenLocus.");
    
    if let Some(context) = input.document_context {
        system_prompt.push_str(&format!("\n\nContext:\n---\n{}\n---", context));
    }

    messages.push(Message { role: "system".to_string(), content: system_prompt });
    messages.extend(input.chat_history);
    messages.push(Message { role: "user".to_string(), content: input.user_message });

    let payload = ChatRequest { model: config.model.clone(), messages, stream: false };
    let mut request = client.post(format!("{}/chat/completions", config.base_url)).json(&payload);

    if let Some(key) = &config.api_key { request = request.bearer_auth(key); }

    let response = request.send().await.map_err(|e| e.to_string())?;
    let chat_res: ChatResponse = response.json().await.map_err(|e| e.to_string())?;

    chat_res.choices.into_iter().next().map(|c| c.message.content).ok_or_else(|| "Empty response".into())
}

#[command]
pub async fn pull_model(app_handle: AppHandle, model_name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut res = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn(async move {
        while let Ok(Some(chunk)) = res.chunk().await {
            // Fix: serde_json::from_slice i.p.v. serde_json::json::from_slice
            if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&chunk) {
                let _ = app_handle.emit("model-pull-progress", json);
            }
        }
    });

    Ok(())
}

#[command]
pub async fn list_models() -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let response: serde_json::Value = client.get("http://localhost:11434/api/tags").send().await.map_err(|e| e.to_string())?.json().await.map_err(|e| e.to_string())?;
    let models = response["models"].as_array().unwrap_or(&vec![]).iter().filter_map(|m| m["name"].as_str().map(|s| s.to_string())).collect();
    Ok(models)
}

#[command]
pub async fn get_llm_status(state: State<'_, LlmState>) -> Result<LlmStatus, String> {
    let config = state.0.read().await;
    let client = reqwest::Client::new();
    let available = client.get(format!("{}/models", config.base_url)).send().await.map(|r| r.status().is_success()).unwrap_or(false);
    Ok(LlmStatus { available, base_url: config.base_url.clone(), model: config.model.clone() })
}
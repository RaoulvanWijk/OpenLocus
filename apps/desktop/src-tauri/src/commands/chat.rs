use std::time::Instant;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{command, State};
use tokio::sync::RwLock;
use uuid::Uuid;

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

// Streaming chunk shapes from Ollama /v1/chat/completions
#[derive(Deserialize)]
struct StreamDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Deserialize)]
struct StreamChunk {
    choices: Vec<StreamChoice>,
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
#[tracing::instrument(
    name = "ollama_chat",
    skip(state, input),
    fields(
        session_id = tracing::field::Empty,
        model      = tracing::field::Empty,
        history_len,
        has_context
    )
)]
pub async fn chat(state: State<'_, LlmState>, input: ChatInput) -> Result<String, String> {
    let session_id = Uuid::new_v4().to_string();
    let span = tracing::Span::current();
    span.record("session_id", &session_id.as_str());
    span.record("history_len", input.chat_history.len());
    span.record("has_context", input.document_context.is_some());

    let config = state.0.read().await;
    span.record("model", &config.model.as_str());

    tracing::debug!(
        event = "request_start",
        session_id,
        model = %config.model,
        base_url = %config.base_url,
    );

    let client = reqwest::Client::new();
    let mut messages: Vec<Message> = Vec::new();
    let mut system_prompt = String::from("You are the AI assistant for OpenLocus.");

    if let Some(context) = input.document_context {
        system_prompt.push_str(&format!("\n\nContext:\n---\n{}\n---", context));
    }

    messages.push(Message { role: "system".to_string(), content: system_prompt });
    messages.extend(input.chat_history);
    messages.push(Message { role: "user".to_string(), content: input.user_message });

    let payload = ChatRequest {
        model: config.model.clone(),
        messages,
        stream: true,
    };

    let mut request = client
        .post(format!("{}/chat/completions", config.base_url))
        .json(&payload);

    if let Some(key) = &config.api_key {
        request = request.bearer_auth(key);
    }

    let t = Instant::now();

    let response = request.send().await.map_err(|e| {
        tracing::error!(event = "request_error", session_id, error = %e);
        e.to_string()
    })?;

    let http_ms = t.elapsed().as_millis();
    tracing::debug!(
        event = "response_received",
        session_id,
        http_ms,
        status = %response.status(),
    );

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();
    let mut first_token_logged = false;
    let mut ttft_ms: u128 = 0;
    let mut chunk_count: usize = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e: reqwest::Error| {
            tracing::error!(event = "stream_error", session_id, error = %e);
            e.to_string()
        })?;

        let text = String::from_utf8_lossy(&chunk);

        for line in text.lines() {
            let Some(json_str) = line.strip_prefix("data: ") else {
                continue;
            };

            if json_str.trim() == "[DONE]" {
                break;
            }

            let Ok(parsed) = serde_json::from_str::<StreamChunk>(json_str) else {
                continue;
            };

            if let Some(token) = parsed
                .choices
                .into_iter()
                .next()
                .and_then(|c| c.delta.content)
            {
                if !token.is_empty() {
                    if !first_token_logged {
                        ttft_ms = t.elapsed().as_millis();
                        tracing::debug!(
                            event = "first_token_received",
                            session_id,
                            ttft_ms,
                        );
                        first_token_logged = true;
                    }

                    full_content.push_str(&token);
                    chunk_count += 1;
                }
            }
        }
    }

    let total_ms = t.elapsed().as_millis();
    let response_tokens = full_content.split_whitespace().count();

    tracing::debug!(
        event = "request_complete",
        session_id,
        total_ms,
        ttft_ms,
        http_ms,
        response_tokens,
        chunk_count,
        model = %config.model,
    );

    if full_content.is_empty() {
        tracing::error!(event = "empty_response", session_id);
        return Err("Empty response".into());
    }

    Ok(full_content)
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
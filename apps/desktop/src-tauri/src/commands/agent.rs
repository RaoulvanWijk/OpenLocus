use serde_json::Value;
use tauri::{command, State};

use crate::commands::llm::LlmState;
use crate::commands::tools::{execute_tool, get_tool_definitions};
use crate::models::tool_call::ToolCall;

const MAX_ITERATIONS: usize = 10;

fn build_system_prompt(note_context: Option<&str>) -> String {
    let mut prompt = String::from(
        "You are an intelligent assistant for OpenLocus, a local note-taking app.\n\n",
    );

    prompt.push_str(get_tool_definitions());

    if let Some(context) = note_context {
        prompt.push_str(&format!(
            "\n\nThe user currently has this note open:\n---\n{}\n---\n",
            context
        ));
    }

    prompt
}

fn try_parse_tool_call(response: &str) -> Option<ToolCall> {
    let start = response.find('{')?;
    let end = response.rfind('}')?;
    if start > end {
        return None;
    }

    let json_str = &response[start..=end];
    let value: Value = serde_json::from_str(json_str).ok()?;

    let name = value["tool"].as_str()?.to_string();
    let arguments = value["arguments"].clone();

    Some(ToolCall { name, arguments })
}

#[command]
pub async fn run_agent(
    state: State<'_, LlmState>,
    user_message: String,
    note_context: Option<String>,
) -> Result<String, String> {
    let config = state.0.read().await;
    let client = reqwest::Client::new();

    let system_prompt = build_system_prompt(note_context.as_deref());

    let mut messages: Vec<serde_json::Value> = vec![
        serde_json::json!({ "role": "system", "content": system_prompt }),
        serde_json::json!({ "role": "user", "content": user_message }),
    ];

    let mut iterations = 0;

    loop {
        if iterations >= MAX_ITERATIONS {
            return Err("Agent reached maximum iterations without a final answer.".to_string());
        }
        iterations += 1;

        tracing::debug!(event = "agent_iteration", iteration = iterations);

        let payload = serde_json::json!({
            "model": config.model,
            "messages": messages,
            "stream": false,
        });

        let mut request = client
            .post(format!("{}/chat/completions", config.base_url))
            .json(&payload);

        if let Some(key) = &config.api_key {
            request = request.bearer_auth(key);
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("LLM unreachable: {}", e))?;

        let response_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Invalid response from LLM: {}", e))?;

        let assistant_content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        tracing::debug!(
            event = "agent_response",
            iteration = iterations,
            content = %assistant_content,
        );

        messages.push(serde_json::json!({
            "role": "assistant",
            "content": assistant_content,
        }));

        match try_parse_tool_call(&assistant_content) {
            Some(tool_call) => {
                tracing::debug!(
                    event = "tool_call",
                    tool = %tool_call.name,
                    args = %tool_call.arguments,
                );

                let result = execute_tool(&tool_call.name, &tool_call.arguments);

                let result_content = format!(
                    "Tool '{}' result (success: {}):\n{}",
                    result.tool, result.success, result.output
                );

                messages.push(serde_json::json!({
                    "role": "user",
                    "content": result_content,
                }));
            }

            None => {
                tracing::debug!(event = "agent_done", iterations = iterations);
                return Ok(assistant_content);
            }
        }
    }
}
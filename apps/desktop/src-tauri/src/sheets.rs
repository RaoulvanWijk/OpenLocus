use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

// ── Config ────────────────────────────────────────────────────────────────────

const SPREADSHEET_ID: &str = "1WabnRSzT6cG1HB7q7HRVEy8GIPLaOEFB-VtrWVOnPMA";

// Sheet tab names
const SHEET_METRICS: &str = "AI Metrics";
const SHEET_ERRORS: &str = "Errors";

// Resolved at compile time to the src-tauri/src directory
const SERVICE_ACCOUNT_KEY: &str =
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/openlocus-496812-64817d4425b4.json"));

// ── Service account key ───────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ServiceAccountKey {
    client_email: String,
    private_key: String,
}

// ── Parsed log events ─────────────────────────────────────────────────────────

#[derive(Debug, Default)]
struct ChatSession {
    timestamp: String,
    session_id: String,
    model: String,
    has_context: bool,
    history_len: u64,
    http_ms: u64,
    ttft_ms: u64,
    total_ms: u64,
    response_tokens: u64,
    chunk_count: u64,
    error: Option<String>,
}

// ── Log parsing ───────────────────────────────────────────────────────────────

/// Reads today's openlocus.log, extracts all complete chat sessions and errors.
pub fn parse_log_file(log_dir: &Path) -> (Vec<ChatSession>, Vec<(String, String)>) {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let log_path = log_dir.join(format!("openlocus.log.{today}"));

    let content = match fs::read_to_string(&log_path) {
        Ok(c) => c,
        Err(e) => {
            tracing::warn!("Could not read log file for Sheets export: {e}");
            return (vec![], vec![]);
        }
    };

    let mut sessions: std::collections::HashMap<String, ChatSession> = Default::default();
    let mut errors: Vec<(String, String)> = vec![];

    for line in content.lines() {
        let timestamp = line.split_whitespace().next().unwrap_or("").to_string();

        let event = extract_field(line, "event");
        let session_id = extract_field(line, "session_id");

        if session_id.is_empty() {
            if line.contains("ERROR") {
                let msg = line
                .splitn(2, "desktop_lib::")
                .last()
                .unwrap_or(line)
                .trim()
                .to_string();
                errors.push((timestamp, msg));
            }
            continue;
        }

        let session = sessions.entry(session_id.clone()).or_default();

        match event.as_str() {
            "request_start" => {
                session.timestamp = timestamp;
                session.session_id = session_id;
                session.model = extract_field(line, "model");
                session.has_context = extract_field(line, "has_context") == "true";
                session.history_len = extract_field(line, "history_len").parse().unwrap_or(0);
            }
            "response_received" => {
                session.http_ms = extract_field(line, "http_ms").parse().unwrap_or(0);
            }
            "first_token_received" => {
                session.ttft_ms = extract_field(line, "ttft_ms").parse().unwrap_or(0);
            }
            "request_complete" => {
                session.total_ms = extract_field(line, "total_ms").parse().unwrap_or(0);
                session.response_tokens =
                    extract_field(line, "response_tokens").parse().unwrap_or(0);
                session.chunk_count = extract_field(line, "chunk_count").parse().unwrap_or(0);
            }
            "request_error" | "parse_error" | "stream_error" | "empty_response" => {
                let error_msg = extract_field(line, "error");
                session.error = Some(format!("{event}: {error_msg}"));
                errors.push((timestamp, format!("session={session_id} {event}: {error_msg}")));
            }
            _ => {}
        }
    }

    let complete: Vec<ChatSession> = sessions
        .into_values()
        .filter(|s| s.total_ms > 0 && !s.session_id.is_empty())
        .collect();

    (complete, errors)
}

/// Extracts a value from a log line like: key=value or key="value"
fn extract_field(line: &str, key: &str) -> String {
    let needle = format!("{key}=");
    let Some(start) = line.find(&needle) else {
        return String::new();
    };
    let rest = &line[start + needle.len()..];

    if rest.starts_with('"') {
        let inner = &rest[1..];
        inner
            .find('"')
            .map(|end| inner[..end].to_string())
            .unwrap_or_default()
    } else {
        rest.split_whitespace().next().unwrap_or("").to_string()
    }
}

// ── Google Sheets export ──────────────────────────────────────────────────────

pub async fn export_to_sheets(log_dir: &Path) {
    let (sessions, errors) = parse_log_file(log_dir);

    if sessions.is_empty() && errors.is_empty() {
        tracing::info!("No data to export to Sheets.");
        return;
    }

    let token = match get_access_token().await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!(error = %e.replace('\n', " "),"Sheets auth failed: {e}");
            return;
        }
    };

    let client = Client::new();
    ensure_headers(&client, &token).await.ok();
    if !sessions.is_empty() {
        let rows: Vec<Vec<Value>> = sessions
            .iter()
            .map(|s| {
                vec![
                    json!(s.timestamp),
                    json!(s.session_id),
                    json!(s.model),
                    json!(s.has_context),
                    json!(s.history_len),
                    json!(s.http_ms),
                    json!(s.ttft_ms),
                    json!(s.total_ms),
                    json!(s.response_tokens),
                    json!(s.chunk_count),
                    json!(s.error.as_deref().unwrap_or("")),
                ]
            })
            .collect();

        if let Err(e) = append_rows(&client, &token, SHEET_METRICS, rows).await {
            tracing::error!(error = %e.replace('\n', " "),"Failed to write AI metrics to Sheets: {e}");
        } else {
            tracing::info!(count = sessions.len(), "AI metrics exported to Sheets");
        }
    }

    if !errors.is_empty() {
        let rows: Vec<Vec<Value>> = errors
            .iter()
            .map(|(ts, msg)| vec![json!(ts), json!(msg)])
            .collect();

        if let Err(e) = append_rows(&client, &token, SHEET_ERRORS, rows).await {
            tracing::error!(error = %e.replace('\n', " "),"Failed to write errors to Sheets: {e}");
        } else {
            tracing::info!(count = errors.len(), "Errors exported to Sheets");
        }
    }
}


async fn append_rows(
    client: &Client,
    token: &str,
    sheet_name: &str,
    rows: Vec<Vec<Value>>,
) -> Result<(), String> {

    let range = format!("{sheet_name}!A:Z");

    let url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS",
        SPREADSHEET_ID,
        range,
    );
    let body = json!({ "values": rows });

    let res = client
        .post(&url)
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("Sheets API {status}: {text}"));
    }

    Ok(())
}

// ── JWT / OAuth2 ──────────────────────────────────────────────────────────────

async fn get_access_token() -> Result<String, String> {
    let key: ServiceAccountKey =
        serde_json::from_str(SERVICE_ACCOUNT_KEY).map_err(|e| format!("Invalid key JSON: {e}"))?;

    let jwt = build_jwt(&key.client_email, &key.private_key)?;

    let client = Client::new();
    let res = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body: Value = res.json().await.map_err(|e| e.to_string())?;

    body["access_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| format!("No access_token in response: {body}"))
}

fn build_jwt(client_email: &str, private_key_pem: &str) -> Result<String, String> {
    use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    #[derive(Serialize)]
    struct Claims {
        iss: String,
        scope: String,
        aud: String,
        iat: u64,
        exp: u64,
    }

    let claims = Claims {
        iss: client_email.to_string(),
        scope: "https://www.googleapis.com/auth/spreadsheets".to_string(),
        aud: "https://oauth2.googleapis.com/token".to_string(),
        iat: now,
        exp: now + 3600,
    };

    let key = EncodingKey::from_rsa_pem(private_key_pem.as_bytes())
        .map_err(|e| format!("Invalid RSA key: {e}"))?;

    encode(&Header::new(Algorithm::RS256), &claims, &key)
        .map_err(|e| format!("JWT encode failed: {e}"))
}

async fn ensure_headers(
    client: &Client,
    token: &str,
) -> Result<(), String> {
    append_rows(
        client,
        token,
        SHEET_METRICS,
        vec![vec![
            json!("timestamp"),
            json!("session_id"),
            json!("model"),
            json!("has_context"),
            json!("history_len"),
            json!("http_ms"),
            json!("ttft_ms"),
            json!("total_ms"),
            json!("response_tokens"),
            json!("chunk_count"),
            json!("error"),
        ]],
    )
    .await?;

    append_rows(
        client,
        token,
        SHEET_ERRORS,
        vec![vec![
            json!("timestamp"),
            json!("message"),
        ]],
    )
    .await?;

    Ok(())
}
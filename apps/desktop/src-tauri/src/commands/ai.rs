use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};
use std::time::Instant;

use futures_util::StreamExt as _;
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaModel},
    sampling::LlamaSampler,
};
use rusqlite::Connection;
use tauri::{AppHandle, Emitter, Manager};

use crate::commands::models::{model_downloaded_with_conn, model_set_downloaded_with_conn};
use crate::db::known_model_by_id;

// ---------- Event payloads ----------

#[derive(serde::Serialize, Clone)]
pub struct DownloadProgress {
    #[serde(rename = "modelId")]
    pub model_id: String,
    pub loaded: u64,
    pub total: u64,
}

#[derive(serde::Serialize, Clone)]
struct ChatToken {
    token: String,
}

#[derive(serde::Serialize, Clone)]
struct ChatError {
    message: String,
}

// ---------- State ----------

struct InferRequest {
    prompt: String,
    app_handle: AppHandle,
}

pub struct LlmHandle {
    tx: mpsc::Sender<InferRequest>,
}

pub struct AppState {
    pub handle: Arc<Mutex<Option<LlmHandle>>>,
    pub last_used: Arc<Mutex<Option<Instant>>>,
    pub loaded_model_id: Arc<Mutex<Option<String>>>,
    pub db: Arc<Mutex<Connection>>,
}

impl AppState {
    pub fn new(db: Connection) -> Self {
        Self {
            handle: Arc::new(Mutex::new(None)),
            last_used: Arc::new(Mutex::new(None)),
            loaded_model_id: Arc::new(Mutex::new(None)),
            db: Arc::new(Mutex::new(db)),
        }
    }
}

// ---------- Inference ----------

fn infer_once(backend: &LlamaBackend, model: &LlamaModel, prompt: &str, app: &AppHandle) {
    let ctx_params = LlamaContextParams::default().with_n_ctx(Some(NonZeroU32::new(4096).unwrap()));

    let mut ctx = match model.new_context(backend, ctx_params) {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                "chat_error",
                ChatError {
                    message: format!("Failed to create inference context: {e}"),
                },
            );
            return;
        }
    };

    let tokens = match model.str_to_token(prompt, AddBos::Always) {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit(
                "chat_error",
                ChatError {
                    message: format!("Failed to tokenize prompt: {e}"),
                },
            );
            return;
        }
    };

    if tokens.is_empty() {
        let _ = app.emit(
            "chat_error",
            ChatError {
                message: "Prompt produced no tokens.".into(),
            },
        );
        return;
    }

    let n_input = tokens.len();
    let mut batch = LlamaBatch::new(n_input.max(512), 1);
    for (i, &tok) in tokens.iter().enumerate() {
        batch.add(tok, i as i32, &[0], i == n_input - 1).unwrap();
    }

    if let Err(e) = ctx.decode(&mut batch) {
        let _ = app.emit(
            "chat_error",
            ChatError {
                message: format!("Failed to process prompt: {e}"),
            },
        );
        return;
    }

    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();

    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::penalties(128, 1.4, 0.15, 0.1),
        LlamaSampler::temp(0.4),
        LlamaSampler::dist(seed),
    ]);

    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = n_input as i32;
    let max_new = 1024i32;
    let mut n_generated = 0;

    loop {
        if n_cur >= n_input as i32 + max_new {
            let _ = app.emit(
                "chat_token",
                ChatToken {
                    token: "\n\n*(response cut off - max length reached)*".into(),
                },
            );
            break;
        }

        let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(new_token);

        if model.is_eog_token(new_token) {
            break;
        }

        match model.token_to_piece(new_token, &mut decoder, false, None) {
            Ok(piece) if !piece.is_empty() => {
                let _ = app.emit("chat_token", ChatToken { token: piece });
                n_generated += 1;
            }
            Err(e) => {
                let _ = app.emit(
                    "chat_error",
                    ChatError {
                        message: format!("Failed to decode token: {e}"),
                    },
                );
                return;
            }
            _ => {}
        }

        batch.clear();
        batch.add(new_token, n_cur, &[0], true).unwrap();
        n_cur += 1;

        if let Err(e) = ctx.decode(&mut batch) {
            let _ = app.emit(
                "chat_error",
                ChatError {
                    message: format!("Inference error after {n_generated} tokens: {e}"),
                },
            );
            return;
        }
    }

    if n_generated == 0 {
        let _ = app.emit(
            "chat_error",
            ChatError {
                message: "Model generated no response. Try rephrasing your message.".into(),
            },
        );
        return;
    }

    let _ = app.emit("chat_done", ());
}

fn run_inference_thread(
    model_path: PathBuf,
    rx: mpsc::Receiver<InferRequest>,
    last_used: Arc<Mutex<Option<Instant>>>,
    handle_slot: Arc<Mutex<Option<LlmHandle>>>,
    loaded_model_id: Arc<Mutex<Option<String>>>,
    startup_app: AppHandle,
) {
    let backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            let _ = startup_app.emit(
                "chat_error",
                ChatError {
                    message: format!("Failed to initialise AI backend: {e}"),
                },
            );
            *handle_slot.lock().unwrap() = None;
            *loaded_model_id.lock().unwrap() = None;
            return;
        }
    };

    let model =
        match LlamaModel::load_from_file(&backend, &model_path, &LlamaModelParams::default()) {
            Ok(m) => m,
            Err(e) => {
                let _ = startup_app.emit(
                    "chat_error",
                    ChatError {
                        message: format!("Failed to load model from disk: {e}"),
                    },
                );
                *handle_slot.lock().unwrap() = None;
                *loaded_model_id.lock().unwrap() = None;
                return;
            }
        };

    eprintln!("[ai] Model loaded, waiting for requests...");

    loop {
        match rx.recv_timeout(std::time::Duration::from_secs(30)) {
            Ok(req) => {
                *last_used.lock().unwrap() = Some(Instant::now());
                infer_once(&backend, &model, &req.prompt, &req.app_handle);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                let idle = last_used
                    .lock()
                    .unwrap()
                    .map(|t| t.elapsed())
                    .unwrap_or_default();

                if idle > std::time::Duration::from_secs(2 * 60) {
                    eprintln!("[ai] Idle timeout, unloading model...");
                    *handle_slot.lock().unwrap() = None;
                    *loaded_model_id.lock().unwrap() = None;
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                eprintln!("[ai] Channel closed, unloading.");
                *handle_slot.lock().unwrap() = None;
                *loaded_model_id.lock().unwrap() = None;
                break;
            }
        }
    }

    *loaded_model_id.lock().unwrap() = None;
    eprintln!("[ai] Model unloaded.");
}

// ---------- Helpers ----------

fn model_file_path(app: &AppHandle, model_id: &str) -> Result<PathBuf, String> {
    let model =
        known_model_by_id(model_id).ok_or_else(|| format!("Unknown model id: {model_id}"))?;

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");

    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(model.file_name))
}

fn read_model_downloaded(state: &tauri::State<AppState>, model_id: &str) -> Result<bool, String> {
    if known_model_by_id(model_id).is_none() {
        return Err(format!("Unknown model id: {model_id}"));
    }

    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    model_downloaded_with_conn(&conn, model_id)
}

fn write_model_downloaded(
    state: &tauri::State<AppState>,
    model_id: &str,
    downloaded: bool,
) -> Result<(), String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Failed to lock database connection".to_string())?;

    model_set_downloaded_with_conn(&conn, model_id, downloaded)
}

fn build_prompt(messages: &[ChatMessage], note_content: &str) -> String {
    let system = if note_content.trim().is_empty() {
        "You are a helpful note-taking assistant. Be concise.".to_owned()
    } else {
        format!(
            "You are a helpful note-taking assistant. \
             The user is working on the following note:\n\n{note_content}\n\n\
             Answer questions about it, summarise it, or help improve it. \
             Be concise and only use information from the note."
        )
    };

    let mut prompt = String::new();
    let mut first_user = true;

    for msg in messages {
        match msg.role.as_str() {
            "user" => {
                if first_user {
                    prompt.push_str(&format!("[INST] {}\n\n{} [/INST]", system, msg.content));
                    first_user = false;
                } else {
                    prompt.push_str(&format!("[INST] {} [/INST]", msg.content));
                }
            }
            "assistant" => {
                prompt.push_str(&format!(" {}</s>", msg.content));
            }
            _ => {}
        }
    }

    prompt
}

// ---------- Commands ----------

#[derive(serde::Serialize)]
pub struct ModelStatus {
    pub downloaded: bool,
    pub loaded: bool,
}

#[tauri::command]
pub fn get_model_status(
    model_id: String,
    state: tauri::State<AppState>,
) -> Result<ModelStatus, String> {
    let downloaded = read_model_downloaded(&state, &model_id)?;
    let loaded_handle_exists = state
        .handle
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())?
        .is_some();
    let loaded_model_id = state
        .loaded_model_id
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())?
        .clone();
    let loaded = loaded_handle_exists && loaded_model_id.as_deref() == Some(model_id.as_str());

    Ok(ModelStatus { downloaded, loaded })
}

#[tauri::command]
pub async fn download_model(
    model_id: String,
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let model =
        known_model_by_id(&model_id).ok_or_else(|| format!("Unknown model id: {model_id}"))?;
    let dest = model_file_path(&app, &model_id)?;

    let already = if dest.exists() {
        std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    let client = reqwest::Client::new();
    let mut req = client.get(model.download_url);
    if already > 0 {
        req = req.header("Range", format!("bytes={already}-"));
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    if response.status().as_u16() == 416 {
        write_model_downloaded(&state, &model_id, true)?;
        let _ = app.emit(
            "model_download_progress",
            DownloadProgress {
                model_id,
                loaded: already,
                total: already,
            },
        );
        return Ok(());
    }

    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(format!("HTTP {} - download failed", response.status()));
    }

    let total = response.content_length().map(|l| l + already).unwrap_or(0);
    let file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&dest)
        .map_err(|e| format!("Failed to create model file: {e}"))?;

    let mut writer = std::io::BufWriter::new(file);
    let mut loaded = already;
    let mut stream = response.bytes_stream();

    use std::io::Write;
    while let Some(chunk) = stream.next().await {
        let chunk: bytes::Bytes = chunk.map_err(|e: reqwest::Error| e.to_string())?;
        writer
            .write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {e}"))?;
        loaded += chunk.len() as u64;
        let _ = app.emit(
            "model_download_progress",
            DownloadProgress {
                model_id: model_id.clone(),
                loaded,
                total,
            },
        );
    }

    writer
        .flush()
        .map_err(|e| format!("Failed to flush file: {e}"))?;

    write_model_downloaded(&state, &model_id, true)?;
    Ok(())
}

#[tauri::command]
pub fn load_model(
    model_id: String,
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let path = model_file_path(&app, &model_id)?;
    let downloaded = read_model_downloaded(&state, &model_id)?;

    if !downloaded || !path.exists() {
        return Err("Model file not found. Download it first.".into());
    }

    let loaded_handle_exists = state
        .handle
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())?
        .is_some();
    let loaded_model_id = state
        .loaded_model_id
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())?
        .clone();

    if loaded_handle_exists && loaded_model_id.as_deref() == Some(model_id.as_str()) {
        return Ok(());
    }

    *state
        .handle
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())? = None;
    *state
        .loaded_model_id
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())? = None;

    let (tx, rx) = mpsc::channel::<InferRequest>();
    let last_used = Arc::clone(&state.last_used);
    let handle_slot = Arc::clone(&state.handle);
    let loaded_model_id_slot = Arc::clone(&state.loaded_model_id);
    let startup_app = app.clone();

    std::thread::spawn(move || {
        run_inference_thread(
            path,
            rx,
            last_used,
            handle_slot,
            loaded_model_id_slot,
            startup_app,
        )
    });

    *state
        .handle
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())? = Some(LlmHandle { tx });
    *state
        .last_used
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())? = Some(Instant::now());
    *state
        .loaded_model_id
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())? = Some(model_id);

    Ok(())
}

#[derive(serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub fn chat(
    messages: Vec<ChatMessage>,
    note_content: String,
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    // Check if model is loaded; if not, try to auto-load the currently active model
    {
        let guard = state
            .handle
            .lock()
            .map_err(|_| "Failed to lock model state".to_string())?;
        if guard.is_some() {
            drop(guard);
        } else {
            // Model not loaded, try to auto-load the active model
            drop(guard);
            let loaded_model_id = state
                .loaded_model_id
                .lock()
                .map_err(|_| "Failed to lock model state".to_string())?
                .clone();

            if let Some(model_id) = loaded_model_id {
                // Try to load the model that was previously loaded
                load_model(model_id.clone(), app.clone(), state.clone())?;
            } else {
                // No previously loaded model, try the default
                load_model("ministral-3b".to_string(), app.clone(), state.clone())?;
            }
        }
    }

    let guard = state
        .handle
        .lock()
        .map_err(|_| "Failed to lock model state".to_string())?;
    let handle = guard.as_ref().ok_or(
        "Model failed to load. Please ensure it has been downloaded.",
    )?;

    let prompt = build_prompt(&messages, &note_content);
    handle
        .tx
        .send(InferRequest {
            prompt,
            app_handle: app,
        })
        .map_err(|_| "Failed to queue message - the inference thread may have crashed.".to_owned())
}

use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{Arc, mpsc, Mutex};
use std::time::Instant;

use futures_util::StreamExt as _;
use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaModel},
    sampling::LlamaSampler,
};
use tauri::{AppHandle, Emitter, Manager};

// ---------- Event payloads ----------

#[derive(serde::Serialize, Clone)]
pub struct DownloadProgress {
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
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            handle: Arc::new(Mutex::new(None)),
            last_used: Arc::new(Mutex::new(None)),
        }
    }
}

// ---------- Inference ----------

fn infer_once(backend: &LlamaBackend, model: &LlamaModel, prompt: &str, app: &AppHandle) {
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(NonZeroU32::new(4096).unwrap()));

    let mut ctx = match model.new_context(backend, ctx_params) {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit("chat_error", ChatError {
                message: format!("Failed to create inference context: {e}"),
            });
            return;
        }
    };

    let tokens = match model.str_to_token(prompt, AddBos::Always) {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit("chat_error", ChatError {
                message: format!("Failed to tokenize prompt: {e}"),
            });
            return;
        }
    };

    if tokens.is_empty() {
        let _ = app.emit("chat_error", ChatError {
            message: "Prompt produced no tokens.".into(),
        });
        return;
    }

    let n_input = tokens.len();
    let mut batch = LlamaBatch::new(n_input.max(512), 1);
    for (i, &tok) in tokens.iter().enumerate() {
        batch.add(tok, i as i32, &[0], i == n_input - 1).unwrap();
    }

    if let Err(e) = ctx.decode(&mut batch) {
        let _ = app.emit("chat_error", ChatError {
            message: format!("Failed to process prompt: {e}"),
        });
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
            // Inform frontend response was cut off
            let _ = app.emit("chat_token", ChatToken {
                token: "\n\n*(response cut off — max length reached)*".into(),
            });
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
                let _ = app.emit("chat_error", ChatError {
                    message: format!("Failed to decode token: {e}"),
                });
                return;
            }
            _ => {}
        }

        batch.clear();
        batch.add(new_token, n_cur, &[0], true).unwrap();
        n_cur += 1;

        if let Err(e) = ctx.decode(&mut batch) {
            let _ = app.emit("chat_error", ChatError {
                message: format!("Inference error after {n_generated} tokens: {e}"),
            });
            return;
        }
    }

    if n_generated == 0 {
        let _ = app.emit("chat_error", ChatError {
            message: "Model generated no response. Try rephrasing your message.".into(),
        });
        return;
    }

    let _ = app.emit("chat_done", ());
}

fn run_inference_thread(
    model_path: PathBuf,
    rx: mpsc::Receiver<InferRequest>,
    last_used: Arc<Mutex<Option<Instant>>>,
    handle_slot: Arc<Mutex<Option<LlmHandle>>>,
    startup_app: AppHandle,
) {
    let backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            let _ = startup_app.emit("chat_error", ChatError {
                message: format!("Failed to initialise AI backend: {e}"),
            });
            *handle_slot.lock().unwrap() = None;
            return;
        }
    };

    let model = match LlamaModel::load_from_file(
        &backend,
        &model_path,
        &LlamaModelParams::default(),
    ) {
        Ok(m) => m,
        Err(e) => {
            let _ = startup_app.emit("chat_error", ChatError {
                message: format!("Failed to load model from disk: {e}"),
            });
            *handle_slot.lock().unwrap() = None;
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
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                eprintln!("[ai] Channel closed, unloading.");
                break;
            }
        }
    }

    eprintln!("[ai] Model unloaded.");
}

// ---------- Helpers ----------

fn model_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("ministral-3b-q4_k_m.gguf"))
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
                    prompt.push_str(&format!(
                        "[INST] {}\n\n{} [/INST]",
                        system, msg.content
                    ));
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
pub fn get_model_status(app: AppHandle, state: tauri::State<AppState>) -> ModelStatus {
    let downloaded = model_file_path(&app).map(|p| p.exists()).unwrap_or(false);
    let loaded = state.handle.lock().unwrap().is_some();
    ModelStatus { downloaded, loaded }
}

#[tauri::command]
pub async fn download_model(app: AppHandle) -> Result<(), String> {
    const URL: &str = "https://huggingface.co/mistralai/Ministral-3-3B-Instruct-2512-GGUF/resolve/main/Ministral-3-3B-Instruct-2512-Q4_K_M.gguf";

    let dest = model_file_path(&app)?;

    let already = if dest.exists() {
        std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    let client = reqwest::Client::new();
    let mut req = client.get(URL);
    if already > 0 {
        req = req.header("Range", format!("bytes={already}-"));
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() && response.status().as_u16() != 206 {
        return Err(format!("HTTP {} — download failed", response.status()));
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
        writer.write_all(&chunk).map_err(|e| format!("Failed to write chunk: {e}"))?;
        loaded += chunk.len() as u64;
        let _ = app.emit("model_download_progress", DownloadProgress { loaded, total });
    }

    writer.flush().map_err(|e| format!("Failed to flush file: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn load_model(app: AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let path = model_file_path(&app)?;
    if !path.exists() {
        return Err("Model file not found. Download it first.".into());
    }

    if state.handle.lock().unwrap().is_some() {
        return Ok(());
    }

    let (tx, rx) = mpsc::channel::<InferRequest>();
    let last_used = Arc::clone(&state.last_used);
    let handle_slot = Arc::clone(&state.handle);
    let startup_app = app.clone();

    std::thread::spawn(move || {
        run_inference_thread(path, rx, last_used, handle_slot, startup_app)
    });

    *state.handle.lock().unwrap() = Some(LlmHandle { tx });
    *state.last_used.lock().unwrap() = Some(Instant::now());
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
    let guard = state.handle.lock().unwrap();
    let handle = guard.as_ref().ok_or(
        "Model is not loaded. It may have been unloaded due to inactivity — please wait a moment."
    )?;

    let prompt = build_prompt(&messages, &note_content);
    handle
        .tx
        .send(InferRequest { prompt, app_handle: app })
        .map_err(|_| "Failed to queue message — the inference thread may have crashed.".to_owned())
}
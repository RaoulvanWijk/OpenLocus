use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{mpsc, Mutex};

use futures_util::StreamExt;
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

#[derive(Default)]
pub struct AppState {
    pub handle: Mutex<Option<LlmHandle>>,
}

// ---------- Inference thread ----------

fn infer_once(backend: &LlamaBackend, model: &LlamaModel, prompt: &str, app: &AppHandle) {
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(NonZeroU32::new(4096).unwrap()));

    let mut ctx = match model.new_context(backend, ctx_params) {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit("chat_error", ChatError { message: format!("{e}") });
            return;
        }
    };

    let tokens = match model.str_to_token(prompt, AddBos::Always) {
        Ok(t) => t,
        Err(e) => {
            let _ = app.emit("chat_error", ChatError { message: format!("{e}") });
            return;
        }
    };

    let n_input = tokens.len();
    let mut batch = LlamaBatch::new(n_input.max(512), 1);

    // batch.add only fails if the batch is full, which can't happen here
    for (i, &tok) in tokens.iter().enumerate() {
        batch.add(tok, i as i32, &[0], i == n_input - 1).unwrap();
    }

    if let Err(e) = ctx.decode(&mut batch) {
        let _ = app.emit("chat_error", ChatError { message: format!("{e}") });
        return;
    }

    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    let mut sampler = LlamaSampler::chain_simple([
        // Penalise repeating the same tokens — stops "securely securely..." loops
        LlamaSampler::penalties(128, 1.4, 0.15, 0.1),
        LlamaSampler::temp(0.4),
        LlamaSampler::dist(seed),
    ]);
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = n_input as i32;
    let max_new = 1024i32;

    loop {
        if n_cur >= n_input as i32 + max_new {
            break;
        }

        let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(new_token);

        if model.is_eog_token(new_token) {
            break;
        }

        if let Ok(piece) = model.token_to_piece(new_token, &mut decoder, false, None) {
            if !piece.is_empty() {
                let _ = app.emit("chat_token", ChatToken { token: piece });
            }
        }

        batch.clear();
        batch.add(new_token, n_cur, &[0], true).unwrap();
        n_cur += 1;

        if let Err(e) = ctx.decode(&mut batch) {
            let _ = app.emit("chat_error", ChatError { message: format!("{e}") });
            break;
        }
    }

    let _ = app.emit("chat_done", ());
}

fn run_inference_thread(model_path: PathBuf, rx: mpsc::Receiver<InferRequest>) {
    let backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            eprintln!("Failed to init llama backend: {e}");
            return;
        }
    };

    let model_params = LlamaModelParams::default();
    let model = match LlamaModel::load_from_file(&backend, &model_path, &model_params) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to load model: {e}");
            return;
        }
    };

    for req in rx {
        eprintln!("\n=== PROMPT (first 600 chars) ===\n{}\n=== END ===\n", &req.prompt[..req.prompt.len().min(600)]);
        infer_once(&backend, &model, &req.prompt, &req.app_handle);
    }
}

// ---------- Tauri commands ----------

/// Returns the path where the model file should be stored.
fn model_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("ministral-3b-q4_k_m.gguf"))
}

#[derive(serde::Serialize)]
pub struct ModelStatus {
    pub downloaded: bool,
    pub loaded: bool,
}

#[tauri::command]
pub fn get_model_status(app: AppHandle, state: tauri::State<AppState>) -> ModelStatus {
    let downloaded = model_file_path(&app)
        .map(|p| p.exists())
        .unwrap_or(false);
    let loaded = state.handle.lock().unwrap().is_some();
    ModelStatus { downloaded, loaded }
}

#[tauri::command]
pub async fn download_model(app: AppHandle) -> Result<(), String> {
    const URL: &str = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf";

    let dest = model_file_path(&app)?;

    // Resume partial downloads
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
        return Err(format!("HTTP {}", response.status()));
    }

    let total = response
        .content_length()
        .map(|l| l + already)
        .unwrap_or(0);

    let file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&dest)
        .map_err(|e| e.to_string())?;

    let mut writer = std::io::BufWriter::new(file);
    let mut loaded = already;
    let mut stream = response.bytes_stream();

    use std::io::Write;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        writer.write_all(&chunk).map_err(|e| e.to_string())?;
        loaded += chunk.len() as u64;
        let _ = app.emit("model_download_progress", DownloadProgress { loaded, total });
    }

    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_model(app: AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    let path = model_file_path(&app)?;
    if !path.exists() {
        return Err("Model file not found. Download it first.".into());
    }

    let (tx, rx) = mpsc::channel::<InferRequest>();

    std::thread::spawn(move || run_inference_thread(path, rx));

    *state.handle.lock().unwrap() = Some(LlmHandle { tx });
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Build a Llama 3 prompt for Llama-3.2-3B-Instruct.
/// BOS token is added by AddBos::Always; we only need the header tags.
fn build_prompt(messages: &[ChatMessage], note_content: &str) -> String {
    let system = if note_content.trim().is_empty() {
        "You are a helpful note-taking assistant.".to_owned()
    } else {
        format!(
            "You are a helpful note-taking assistant. \
             The user is working on the following note:\n\n{note_content}\n\n\
             Answer questions about it, summarise it, or help improve it. \
             Be concise and only use information from the note."
        )
    };

    let mut prompt = format!(
        "<|start_header_id|>system<|end_header_id|>\n\n{system}<|eot_id|>"
    );

    for msg in messages {
        match msg.role.as_str() {
            "user" => {
                prompt.push_str(&format!(
                    "<|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|>",
                    msg.content
                ));
            }
            "assistant" => {
                prompt.push_str(&format!(
                    "<|start_header_id|>assistant<|end_header_id|>\n\n{}<|eot_id|>",
                    msg.content
                ));
            }
            _ => {}
        }
    }

    // Open the assistant turn
    prompt.push_str("<|start_header_id|>assistant<|end_header_id|>\n\n");
    prompt
}

#[tauri::command]
pub fn chat(
    messages: Vec<ChatMessage>,
    note_content: String,
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<(), String> {
    let guard = state.handle.lock().unwrap();
    let handle = guard
        .as_ref()
        .ok_or("Model is not loaded. Call load_model first.")?;

    let prompt = build_prompt(&messages, &note_content);

    handle
        .tx
        .send(InferRequest { prompt, app_handle: app })
        .map_err(|_| "Failed to queue message.".to_owned())
}

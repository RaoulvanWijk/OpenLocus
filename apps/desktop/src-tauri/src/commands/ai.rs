use llama_cpp_2::{
    context::params::LlamaContextParams,
    llama_backend::LlamaBackend,
    llama_batch::LlamaBatch,
    model::{params::LlamaModelParams, AddBos, LlamaModel, Special},
    sampling::LlamaSampler,
    token::LlamaToken,
};
use std::{
    num::NonZeroU32,
    path::PathBuf,
    sync::Mutex,
    time::Instant,
};
use tauri::State;

pub struct AiState {
    pub model: Mutex<Option<LlamaModel>>,
    pub backend: Mutex<Option<LlamaBackend>>,
    pub last_used: Mutex<Instant>,
}

impl Default for AiState {
    fn default() -> Self {
        Self {
            model: Mutex::new(None),
            backend: Mutex::new(None),
            last_used: Mutex::new(Instant::now()),
        }
    }
}

fn model_path() -> PathBuf {
    let home = dirs_next::home_dir().expect("Could not find home dir");
    home.join(".openlocus")
        .join("models")
        .join("mistral-small-3.1.gguf")
}

#[tauri::command]
pub async fn download_model() -> Result<String, String> {
    let path = model_path();

    if path.exists() {
        return Ok(format!("Model already exists at {:?}", path));
    }

    std::fs::create_dir_all(path.parent().unwrap())
        .map_err(|e| format!("Failed to create model dir: {e}"))?;

    println!("[ai] Downloading model to {:?}", path);

    let api = hf_hub::api::sync::Api::new()
        .map_err(|e| format!("Failed to create HF API: {e}"))?;

    let repo = api.model(
        "bartowski/mistralai_Mistral-Small-3.1-24B-Instruct-2503-GGUF".to_string(),
    );
    let downloaded = repo
        .get("mistralai_Mistral-Small-3.1-24B-Instruct-2503-Q4_K_M.gguf")
        .map_err(|e| format!("Download failed: {e}"))?;

    std::fs::copy(&downloaded, &path)
        .map_err(|e| format!("Failed to copy model: {e}"))?;

    Ok(format!("Model downloaded to {:?}", path))
}

#[tauri::command]
pub async fn check_model_exists() -> bool {
    model_path().exists()
}

#[tauri::command]
pub async fn run_inference(
    prompt: String,
    state: State<'_, AiState>,
) -> Result<String, String> {
    let path = model_path();
    if !path.exists() {
        return Err("Model not downloaded yet. Call download_model first.".into());
    }

    // Init backend once
    {
        let mut backend_guard = state.backend.lock().unwrap();
        if backend_guard.is_none() {
            let backend = LlamaBackend::init()
                .map_err(|e| format!("Backend init failed: {e}"))?;
            *backend_guard = Some(backend);
        }
    }

    // Lazy-load model
    {
        let mut model_guard = state.model.lock().unwrap();
        if model_guard.is_none() {
            println!("[ai] Loading model from {:?}", path);
            let backend_guard = state.backend.lock().unwrap();
            let params = LlamaModelParams::default();
            let model = LlamaModel::load_from_file(
                backend_guard.as_ref().unwrap(),
                &path,
                &params,
            )
            .map_err(|e| format!("Model load failed: {e}"))?;
            *model_guard = Some(model);
            println!("[ai] Model loaded!");
        }
    }

    *state.last_used.lock().unwrap() = Instant::now();

    let model_guard = state.model.lock().unwrap();
    let model = model_guard.as_ref().unwrap();

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(2048));

    let backend_guard = state.backend.lock().unwrap();
    let mut ctx = model
        .new_context(backend_guard.as_ref().unwrap(), ctx_params)
        .map_err(|e| format!("Context creation failed: {e}"))?;

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| format!("Tokenization failed: {e}"))?;

    let mut batch = LlamaBatch::new(512, 1);
    let last_idx = (tokens.len() - 1) as i32;
    for (i, token) in tokens.into_iter().enumerate() {
        batch
            .add(token, i as i32, &[0], i as i32 == last_idx)
            .map_err(|e| format!("Batch add failed: {e}"))?;
    }

    ctx.decode(&mut batch)
        .map_err(|e| format!("Decode failed: {e}"))?;

    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::temp(0.8),
        LlamaSampler::greedy(),
    ]);

    // Collect raw bytes from each token, then decode once at the end
    // This correctly handles multi-byte UTF-8 codepoints split across tokens
    let mut output_bytes: Vec<u8> = Vec::new();
    let mut n_cur = batch.n_tokens();

    loop {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        // token_to_bytes returns Vec<u8> - no decoder needed
        let bytes = model
            .token_to_bytes(token, Special::Plaintext)
            .map_err(|e| format!("Token to bytes failed: {e}"))?;
        output_bytes.extend_from_slice(&bytes);

        batch.clear();
        batch
            .add(token, n_cur, &[0], true)
            .map_err(|e| format!("Batch add failed: {e}"))?;

        n_cur += 1;
        ctx.decode(&mut batch)
            .map_err(|e| format!("Decode failed: {e}"))?;

        if n_cur >= 512 {
            break;
        }
    }

    // Decode the full byte sequence at once - handles split UTF-8 correctly
    let output = String::from_utf8_lossy(&output_bytes).into_owned();

    Ok(output)
}
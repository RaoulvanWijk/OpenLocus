use std::{fs, path::PathBuf, sync::OnceLock};

use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{prelude::*, EnvFilter};

use crate::error::{AppError, Result};

static LOG_GUARD: OnceLock<WorkerGuard> = OnceLock::new();
static LOGGER_INITIALIZED: OnceLock<()> = OnceLock::new();

pub fn init_logging() -> Result<()> {
    if LOGGER_INITIALIZED.get().is_some() {
        return Ok(());
    }

    let log_dir = resolve_log_directory()?;
    fs::create_dir_all(&log_dir)?;

    let file_appender = tracing_appender::rolling::daily(&log_dir, "openlocus.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,openlocus=debug,desktop_lib=debug,tauri=warn"));

    let subscriber = tracing_subscriber::registry()
        .with(env_filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_ansi(false)
                .with_thread_ids(true)
                .with_target(true)
                .with_writer(non_blocking),
        );

    tracing::subscriber::set_global_default(subscriber)
        .map_err(|err| AppError::Internal(format!("Failed to initialize logger: {err}")))?;

    let _ = LOG_GUARD.set(guard);
    let _ = LOGGER_INITIALIZED.set(());

    tracing::debug!(log_dir = %log_dir.display(), "File logging initialized");

    Ok(())
}

fn resolve_log_directory() -> Result<PathBuf> {
    dirs_next::data_local_dir()
        .map(|path| path.join("OpenLocus").join("logs"))
        .ok_or_else(|| AppError::Internal("Could not resolve local data directory".to_string()))
}

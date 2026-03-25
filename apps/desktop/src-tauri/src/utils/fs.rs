use std::path::PathBuf;

use crate::error::{AppError, Result as AppResult};

pub fn openlocus_dir() -> AppResult<PathBuf> {
    Ok(dirs_next::home_dir()
        .ok_or_else(|| AppError::Internal("Could not resolve home directory".to_string()))?
        .join("OpenLocus"))
}

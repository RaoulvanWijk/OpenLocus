use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database error: {0}")]
    Database(String),

    #[error("AI error: {0}")]
    Ai(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        // Voor nu sturen we de error message als simpele string.
        // In Task 167028 wordt dit een uitgebreider DTO { code, technical_details, context }
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_io_error_conversion() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_err: AppError = io_err.into();
        
        assert!(matches!(app_err, AppError::Io(_)));
        assert_eq!(app_err.to_string(), "I/O error: file not found");
    }

    #[test]
    fn test_database_error_formatting() {
        let app_err = AppError::Database("connection failed".into());
        assert_eq!(app_err.to_string(), "Database error: connection failed");
    }

    #[test]
    fn test_internal_error_formatting() {
        let app_err = AppError::Internal("unexpected state".into());
        assert_eq!(app_err.to_string(), "Internal error: unexpected state");
    }
}

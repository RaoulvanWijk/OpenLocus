use serde::{Serialize, Serializer};
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[serde(tag = "error_code")]
#[ts(export, rename = "AppError")]
pub enum ErrorDto {
    #[serde(rename = "IO")]
    Io {
        #[ts(type = "\"filesystem\"")]
        context: String,
        technical_details: Option<String>,
    },

    #[serde(rename = "DB")]
    Db {
        #[ts(type = "\"database\"")]
        context: String,
        technical_details: Option<String>,
    },

    #[serde(rename = "AI")]
    Ai {
        #[ts(type = "\"ai\"")]
        context: String,
        technical_details: Option<String>,
    },

    #[serde(rename = "INTERNAL")]
    Internal {
        #[ts(type = "\"internal\"")]
        context: String,
        technical_details: Option<String>,
    },
}

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

impl AppError {
    pub fn to_dto(&self) -> ErrorDto {
        // Securely hide internal logs from production users
        let details = if cfg!(debug_assertions) {
            Some(self.to_string())
        } else {
            None
        };

        match self {
            Self::Io(_) => ErrorDto::Io {
                context: "filesystem".to_string(),
                technical_details: details.clone(),
            },
            Self::Database(_) => ErrorDto::Db {
                context: "database".to_string(),
                technical_details: details.clone(),
            },
            Self::Ai(_) => ErrorDto::Ai {
                context: "ai".to_string(),
                technical_details: details.clone(),
            },
            Self::Internal(_) => ErrorDto::Internal {
                context: "internal".to_string(),
                technical_details: details.clone(),
            },
        }
    }
}

impl From<&AppError> for ErrorDto {
    fn from(value: &AppError) -> Self {
        value.to_dto()
    }
}

impl From<AppError> for ErrorDto {
    fn from(value: AppError) -> Self {
        (&value).into()
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        ErrorDto::from(self).serialize(serializer)
    }
}

pub type Result<T> = std::result::Result<T, AppError>;

/// Log an error that has been mapped to the ErrorDto contract.
/// Extracts error code and context for structured error logging.
pub fn log_contract_error(command: &str, operation: &str, app_error: &AppError) {
    let dto = ErrorDto::from(app_error);

    match dto {
        ErrorDto::Io {
            context,
            technical_details,
        }
        | ErrorDto::Db {
            context,
            technical_details,
        }
        | ErrorDto::Ai {
            context,
            technical_details,
        }
        | ErrorDto::Internal {
            context,
            technical_details,
        } => {
            tracing::error!(
                command,
                operation,
                context,
                technical_details = ?technical_details,
                "Command failed with mapped contract error"
            );
        }
    }
}

/// Map an I/O error to AppError, log it, and return the error.
/// This centralizes I/O error handling across all commands.
pub fn map_io_error(command: &str, operation: &str, io_error: std::io::Error) -> AppError {
    let app_error = AppError::from(io_error);
    log_contract_error(command, operation, &app_error);
    app_error
}

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
    fn test_app_error_serializes_to_error_dto_shape() {
        let app_err = AppError::Ai("model unavailable".into());

        // We serialize it to a raw JSON value to prove the frontend gets exactly what we expect
        let value = serde_json::to_value(&app_err).expect("serialization should succeed");

        assert_eq!(value["error_code"], "AI");
        assert_eq!(value["context"], "ai");

        // This test assumes debug_assertions are ON (which they are during `cargo test`)
        assert_eq!(value["technical_details"], "AI error: model unavailable");
    }

    #[test]
    fn test_error_dto_from_app_error() {
        let dto = ErrorDto::from(AppError::Internal("failure".into()));

        match dto {
            ErrorDto::Internal {
                context,
                technical_details,
            } => {
                assert_eq!(context, "internal");
                assert_eq!(
                    technical_details,
                    Some("Internal error: failure".to_string())
                );
            }
            _ => panic!("expected internal dto variant"),
        }
    }
}

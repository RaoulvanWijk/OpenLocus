use serde::{Serialize, Serializer};
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[serde(tag = "error_code")] 
#[ts(export)] 
pub enum ErrorDto {
    #[serde(rename = "IO")]
    Io { 
        #[ts(type = "\"filesystem\"")] 
        context: String, 
        #[serde(skip_serializing_if = "Option::is_none")]
        technical_details: Option<String> 
    },
    
    #[serde(rename = "DB")]
    Db { 
        #[ts(type = "\"database\"")]
        context: String, 
        #[serde(skip_serializing_if = "Option::is_none")]
        technical_details: Option<String> 
    },
    
    #[serde(rename = "AI")]
    Ai { 
        #[ts(type = "\"ai\"")]
        context: String, 
        #[serde(skip_serializing_if = "Option::is_none")]
        technical_details: Option<String> 
    },
    
    #[serde(rename = "INTERNAL")]
    Internal { 
        #[ts(type = "\"internal\"")]
        context: String, 
        #[serde(skip_serializing_if = "Option::is_none")]
        technical_details: Option<String> 
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
                technical_details: details.clone() 
            },
            Self::Database(_) => ErrorDto::Db { 
                context: "database".to_string(), 
                technical_details: details.clone() 
            },
            Self::Ai(_) => ErrorDto::Ai { 
                context: "ai".to_string(), 
                technical_details: details.clone() 
            },
            Self::Internal(_) => ErrorDto::Internal { 
                context: "internal".to_string(), 
                technical_details: details.clone() 
            },
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.to_dto().serialize(serializer)
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
    fn test_app_error_serializes_to_error_dto_shape() {
        let app_err = AppError::Ai("model unavailable".into());

        // We serialize it to a raw JSON value to prove the frontend gets exactly what we expect
        let value = serde_json::to_value(&app_err).expect("serialization should succeed");

        assert_eq!(value["error_code"], "AI");
        assert_eq!(value["context"], "ai");
        
        // This test assumes debug_assertions are ON (which they are during `cargo test`)
        assert_eq!(value["technical_details"], "AI error: model unavailable");
    }
}
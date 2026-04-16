pub mod document;
pub mod llm_client;
pub mod ollama_manager;
pub mod splash;
pub mod settings;

use std::sync::Mutex;
use rusqlite::Connection;

pub struct DbState(pub Mutex<Connection>);
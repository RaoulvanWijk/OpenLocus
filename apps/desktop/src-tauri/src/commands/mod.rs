pub mod document;
pub mod llm;
pub mod ollama_manager;
pub mod settings;
pub mod splash;
pub mod tools;
pub mod agent;
pub mod model_db;

use std::sync::Mutex;
use rusqlite::Connection;

pub struct DbState(pub Mutex<Connection>);
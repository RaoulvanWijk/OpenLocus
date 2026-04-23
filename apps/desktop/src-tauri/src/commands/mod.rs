pub mod document;
pub mod chat;
pub mod ollama_manager;
pub mod settings;
pub mod splash;
pub mod model_db;

use std::sync::Mutex;
use rusqlite::Connection;

pub struct DbState(pub Mutex<Connection>);
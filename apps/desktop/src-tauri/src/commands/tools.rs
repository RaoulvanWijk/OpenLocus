use crate::models::tool_call::ToolResult;
use crate::commands::document;

pub fn get_tool_definitions() -> &'static str {
    r#"
You have access to tools to read and write the user's notes.

IMPORTANT RULES:
- Always call list_documents first if you need a document ID — never guess an ID
- Always use markdown format for document content, never HTML
- Only respond with your final answer in plain text — never show raw JSON to the user
- Call one tool at a time and wait for the result before continuing

To call a tool, respond with ONLY this JSON and nothing else:
{"tool": "tool_name", "arguments": { ... }}

Available tools:

- list_documents
  Description: List all documents with their IDs and titles.
  Arguments: {}

- get_document
  Description: Get the full content of a document by ID.
  Arguments: {"id": "<document_id>"}

- update_document
  Description: Update the content and title of a document.
  Arguments: {"id": "<document_id>", "title": "<title>", "content": "<markdown content>"}

- create_document
  Description: Create a new document.
  Arguments: {"path": "<filename>.md", "title": "<title>"}
"#
}

pub fn execute_tool(name: &str, arguments: &serde_json::Value) -> ToolResult {
    match name {
        "list_documents" => {
            match document::document_list() {
                Ok(docs) => ToolResult {
                    tool: name.to_string(),
                    success: true,
                    output: serde_json::to_string(&docs).unwrap_or_default(),
                },
                Err(e) => ToolResult {
                    tool: name.to_string(),
                    success: false,
                    output: e.to_string(),
                },
            }
        }

        "get_document" => {
            let id = arguments["id"].as_str().unwrap_or_default().to_string();
            match document::document_get(id) {
                Ok(doc) => ToolResult {
                    tool: name.to_string(),
                    success: true,
                    output: serde_json::to_string(&doc).unwrap_or_default(),
                },
                Err(e) => ToolResult {
                    tool: name.to_string(),
                    success: false,
                    output: e.to_string(),
                },
            }
        }

        "update_document" => {
            let id = arguments["id"].as_str().unwrap_or_default().to_string();
            let title = arguments["title"].as_str().unwrap_or_default().to_string();
            let content = arguments["content"].as_str().unwrap_or_default().to_string();
            match document::document_update(id, content, title) {
                Ok(_) => ToolResult {
                    tool: name.to_string(),
                    success: true,
                    output: "Document updated successfully.".to_string(),
                },
                Err(e) => ToolResult {
                    tool: name.to_string(),
                    success: false,
                    output: e.to_string(),
                },
            }
        }

        "create_document" => {
            let path = arguments["path"].as_str().unwrap_or_default().to_string();
            let title = arguments["title"].as_str().map(|s| s.to_string());
            match document::document_create(path, title) {
                Ok(result) => ToolResult {
                    tool: name.to_string(),
                    success: true,
                    output: serde_json::to_string(&result).unwrap_or_default(),
                },
                Err(e) => ToolResult {
                    tool: name.to_string(),
                    success: false,
                    output: e.to_string(),
                },
            }
        }

        _ => ToolResult {
            tool: name.to_string(),
            success: false,
            output: format!("Unknown tool: {}", name),
        },
    }
}
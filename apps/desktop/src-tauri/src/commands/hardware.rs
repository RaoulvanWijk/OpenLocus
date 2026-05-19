use sysinfo::System;

use crate::models::hardware::SystemInfoResult;

fn bytes_to_gib(bytes: u64) -> f64 {
	bytes as f64 / 1024.0 / 1024.0 / 1024.0
}

fn model_recommendation(available_memory_gib: f64) -> Option<&'static str> {
	if available_memory_gib >= 16.0 {
		Some("High tier model")
	} else if available_memory_gib >= 8.0 {
		Some("Mid tier model")
	} else if available_memory_gib <= 4.0 {
		Some("Lowest tier model")
	} else {
		None
	}
}

#[tauri::command]
pub fn print_system_info() -> SystemInfoResult {
	let system = System::new_all();

	let logical_cores = system.cpus().len();
	let physical_cores = System::physical_core_count().unwrap_or(logical_cores);
	let total_memory_gib = bytes_to_gib(system.total_memory());
	let available_memory_gib = bytes_to_gib(system.available_memory());
    let recommendation = model_recommendation(available_memory_gib).map(str::to_string);

	SystemInfoResult {
		logical_cores,
		physical_cores,
		total_memory_gib,
		available_memory_gib,
		recommendation,
	}
}

mod inspector;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            inspector::list_windows,
            inspector::inspect_window,
            inspector::describe_element,
            inspector::run_action,
            inspector::capture_element
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

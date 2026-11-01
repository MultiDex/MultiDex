mod elevation;
mod events;
mod highlight;
mod inspector;

use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Phím tắt toàn cục để chộp element đang nằm dưới con trỏ, kể cả khi WinDex
/// không phải cửa sổ đang hoạt động. Ctrl+Alt+I hiếm app nào dùng.
fn pick_shortcut() -> Shortcut {
    Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyI)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if *shortcut != pick_shortcut() || event.state() != ShortcutState::Pressed {
                        return;
                    }
                    // Việc dò cây có thể mất vài trăm ms nên không giữ luồng xử lý phím
                    let app = app.clone();
                    tauri::async_runtime::spawn_blocking(move || {
                        let _ = match inspector::locate_under_cursor() {
                            Ok(found) => app.emit("element-picked", found),
                            Err(message) => app.emit("element-pick-failed", message),
                        };
                    });
                })
                .build(),
        )
        .setup(|app| {
            app.global_shortcut().register(pick_shortcut())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            inspector::list_windows,
            inspector::inspect_window,
            inspector::describe_element,
            inspector::run_action,
            inspector::capture_element,
            inspector::element_at_point,
            highlight::show_highlight,
            highlight::hide_highlight,
            elevation::is_elevated,
            elevation::relaunch_as_admin,
            events::start_focus_log,
            events::stop_focus_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

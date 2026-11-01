use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use uiautomation::UIElement;
use uiautomation::events::{CustomFocusChangedEventHandler, UIFocusChangedEventHandler};

/// Chỉ cho một phiên ghi nhật ký chạy một lúc; luồng ghi tự thoát khi cờ tắt.
static RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusEvent {
    name: String,
    automation_id: String,
    classname: String,
    control_type: String,
    process_id: u32,
}

struct Relay {
    app: AppHandle,
}

impl CustomFocusChangedEventHandler for Relay {
    fn handle(&self, sender: &UIElement) -> uiautomation::Result<()> {
        let event = FocusEvent {
            name: sender.get_name().unwrap_or_default(),
            automation_id: sender.get_automation_id().unwrap_or_default(),
            classname: sender.get_classname().unwrap_or_default(),
            control_type: sender
                .get_control_type()
                .map(|t| format!("{t:?}"))
                .unwrap_or_default(),
            process_id: sender.get_process_id().unwrap_or(0),
        };
        let _ = self.app.emit("focus-changed", event);
        Ok(())
    }
}

/// Bắt đầu theo dõi: mỗi lần focus bàn phím chuyển sang element khác thì phát
/// một sự kiện về giao diện. Hữu ích để xem app phản ứng gì khi thao tác.
#[tauri::command]
pub fn start_focus_log(app: AppHandle) -> Result<(), String> {
    if RUNNING.swap(true, Ordering::SeqCst) {
        return Ok(()); // đang chạy rồi
    }

    std::thread::spawn(move || {
        // UIAutomation phải sống suốt phiên, nếu thả sớm thì handler ngừng bắn
        let automation = match crate::inspector::new_automation() {
            Ok(automation) => automation,
            Err(error) => {
                RUNNING.store(false, Ordering::SeqCst);
                let _ = app.emit("focus-log-failed", error.to_string());
                return;
            }
        };

        let handler: UIFocusChangedEventHandler = Relay { app: app.clone() }.into();
        if let Err(error) = automation.add_focus_changed_event_handler(None, &handler) {
            RUNNING.store(false, Ordering::SeqCst);
            let _ = app.emit("focus-log-failed", error.to_string());
            return;
        }

        while RUNNING.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(200));
        }
        let _ = automation.remove_focus_changed_event_handler(&handler);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_focus_log() {
    RUNNING.store(false, Ordering::SeqCst);
}

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};

const LABEL: &str = "highlight";

/// Cửa sổ viền đỏ vẽ chồng lên element đang chọn. Dựng bằng cửa sổ Tauri trong suốt
/// thay vì overlay Win32: Tauri đã lo vòng lặp thông điệp và việc dọn dẹp.
fn overlay(app: &AppHandle) -> tauri::Result<tauri::WebviewWindow> {
    if let Some(window) = app.get_webview_window(LABEL) {
        return Ok(window);
    }
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("highlight.html".into()))
        .title("Highlight")
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focused(false)
        .shadow(false)
        .visible(false)
        .build()?;
    // Cho chuột xuyên qua, nếu không thì khung đỏ chặn mất thao tác lên app đích
    window.set_ignore_cursor_events(true)?;
    Ok(window)
}

#[tauri::command]
pub async fn show_highlight(
    app: AppHandle,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Element không có kích thước để vẽ khung".into());
    }
    let window = overlay(&app).map_err(|e| e.to_string())?;
    let apply = || -> tauri::Result<()> {
        window.set_position(PhysicalPosition::new(x, y))?;
        window.set_size(PhysicalSize::new(width, height))?;
        window.show()?;
        window.set_always_on_top(true)?;
        Ok(())
    };
    apply().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn hide_highlight(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(LABEL) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

use windows::Win32::UI::Shell::{IsUserAnAdmin, ShellExecuteW};
use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
use windows::core::{HSTRING, PCWSTR, w};

/// App chạy quyền thường sẽ không thấy cửa sổ của app chạy elevated — UIA chặn
/// theo mức toàn vẹn (integrity level), không phải do thiếu quyền đọc.
#[tauri::command]
pub fn is_elevated() -> bool {
    unsafe { IsUserAnAdmin() }.as_bool()
}

/// Mở lại chính exe này qua verb `runas` để Windows hiện hộp thoại UAC,
/// rồi tắt tiến trình hiện tại. Người dùng bấm Huỷ thì giữ nguyên tiến trình cũ.
#[tauri::command]
pub fn relaunch_as_admin(app: tauri::AppHandle) -> Result<(), String> {
    if is_elevated() {
        return Err("Đang chạy với quyền admin rồi".into());
    }
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let path = HSTRING::from(exe.as_os_str());

    let result = unsafe {
        ShellExecuteW(
            None,
            w!("runas"),
            PCWSTR(path.as_ptr()),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        )
    };

    // ShellExecuteW trả giá trị > 32 khi thành công; nhỏ hơn là mã lỗi
    if result.0 as usize <= 32 {
        return Err("Không mở lại được với quyền admin, có thể bạn đã bấm Huỷ".into());
    }
    app.exit(0);
    Ok(())
}

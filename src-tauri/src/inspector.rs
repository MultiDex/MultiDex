use std::sync::Mutex;

use serde::Serialize;
use uiautomation::types::Rect;
use uiautomation::patterns::{UIInvokePattern, UITogglePattern, UIValuePattern};
use uiautomation::{UIAutomation, UIElement, UITreeWalker};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::Graphics::Gdi::{
    BI_RGB, BITMAPINFO, BITMAPINFOHEADER, CreateCompatibleBitmap, CreateCompatibleDC, DIB_RGB_COLORS,
    DeleteDC, DeleteObject, GetDC, GetDIBits, ReleaseDC, SelectObject,
};
use windows::Win32::Storage::Xps::{PRINT_WINDOW_FLAGS, PrintWindow};
use windows::Win32::UI::WindowsAndMessaging::{GetWindowRect, PW_RENDERFULLCONTENT};

/// shortcut: bỏ qua node thứ 500 trở đi của mỗi cấp, nâng khi cần soi bảng/list dài
const MAX_SIBLINGS: usize = 500;

/// shortcut: trần 20k node cho cả cây, nâng nếu gặp app lớn hơn mà vẫn muốn lấy đủ
const MAX_NODES: usize = 20_000;

/// shortcut: chặn đệ quy quá sâu cho khỏi tràn stack; cây UIA thật hiếm khi quá 50 cấp
const MAX_DEPTH: usize = 200;

/// UI Automation trả E_FAIL khi nhiều luồng cùng khởi tạo COM, nên các lượt đọc phải nối đuôi.
static UIA_LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    runtime_id: Vec<i32>,
    name: String,
    classname: String,
    process_id: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    name: String,
    automation_id: String,
    classname: String,
    control_type: String,
    rect: [i32; 4],
    /// Chỉ số con tính từ cửa sổ gốc; dùng để tìm lại đúng element khi thao tác
    path: Vec<usize>,
    truncated: bool,
    children: Vec<Node>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementDetail {
    name: String,
    automation_id: String,
    classname: String,
    control_type: String,
    enabled: bool,
    offscreen: bool,
    value: Option<String>,
    readonly: bool,
    toggle_state: Option<String>,
    /// invoke | toggle | value | focus — "keys" luôn dùng được nên không liệt kê
    actions: Vec<String>,
}

fn with_uia<T>(f: impl FnOnce(&UITreeWalker, &UIElement) -> T) -> uiautomation::Result<T> {
    let _guard = UIA_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let automation = UIAutomation::new()?;
    let walker = automation.get_control_view_walker()?;
    let root = automation.get_root_element()?;
    Ok(f(&walker, &root))
}

/// Duyệt các anh em kể từ `first`. Trả về (kết quả, có bị cắt ở MAX_SIBLINGS không).
fn each_sibling<T>(
    walker: &UITreeWalker,
    first: UIElement,
    mut f: impl FnMut(&UIElement) -> T,
) -> (Vec<T>, bool) {
    let mut out = Vec::new();
    let mut cur = first;
    loop {
        out.push(f(&cur));
        let Ok(next) = walker.get_next_sibling(&cur) else {
            return (out, false);
        };
        if out.len() >= MAX_SIBLINGS {
            return (out, true);
        }
        cur = next;
    }
}

fn children_of(walker: &UITreeWalker, el: &UIElement) -> Vec<UIElement> {
    match walker.get_first_child(el) {
        Ok(first) => each_sibling(walker, first, |c| c.clone()).0,
        Err(_) => Vec::new(),
    }
}

fn to_node(el: &UIElement, path: Vec<usize>, children: Vec<Node>, truncated: bool) -> Node {
    let rect = el
        .get_bounding_rectangle()
        .map(|r| [r.get_left(), r.get_top(), r.get_right(), r.get_bottom()])
        .unwrap_or_default();
    Node {
        name: el.get_name().unwrap_or_default(),
        automation_id: el.get_automation_id().unwrap_or_default(),
        classname: el.get_classname().unwrap_or_default(),
        control_type: el
            .get_control_type()
            .map(|t| format!("{t:?}"))
            .unwrap_or_default(),
        rect,
        path,
        truncated,
        children,
    }
}

/// Duyệt hết cây con, dừng khi cạn `budget` node hoặc chạm trần độ sâu.
fn walk(walker: &UITreeWalker, el: &UIElement, path: Vec<usize>, budget: &mut usize) -> Node {
    if *budget == 0 || path.len() >= MAX_DEPTH {
        return to_node(el, path, Vec::new(), true);
    }
    let Ok(first) = walker.get_first_child(el) else {
        return to_node(el, path, Vec::new(), false);
    };
    let mut index = 0;
    let (children, truncated) = each_sibling(walker, first, |child| {
        *budget = budget.saturating_sub(1);
        let mut child_path = path.clone();
        child_path.push(index);
        index += 1;
        walk(walker, child, child_path, budget)
    });
    to_node(el, path, children, truncated)
}

fn find_window(walker: &UITreeWalker, root: &UIElement, runtime_id: &[i32]) -> Option<UIElement> {
    children_of(walker, root)
        .into_iter()
        .find(|el| el.get_runtime_id().unwrap_or_default() == runtime_id)
}

fn find_by_path(walker: &UITreeWalker, window: &UIElement, path: &[usize]) -> Option<UIElement> {
    let mut cur = window.clone();
    for &index in path {
        cur = children_of(walker, &cur).into_iter().nth(index)?;
    }
    Some(cur)
}

fn collect_windows() -> uiautomation::Result<Vec<WindowInfo>> {
    with_uia(|walker, root| {
        // Cửa sổ không tiêu đề hầu hết là cửa sổ ẩn của hệ thống, lọc cho đỡ nhiễu
        children_of(walker, root)
            .into_iter()
            .map(|el| WindowInfo {
                runtime_id: el.get_runtime_id().unwrap_or_default(),
                name: el.get_name().unwrap_or_default(),
                classname: el.get_classname().unwrap_or_default(),
                process_id: el.get_process_id().unwrap_or(0),
            })
            .filter(|w| !w.name.trim().is_empty())
            .collect()
    })
}

fn build_tree(runtime_id: Vec<i32>) -> uiautomation::Result<Option<Node>> {
    with_uia(|walker, root| {
        find_window(walker, root, &runtime_id).map(|win| {
            let mut budget = MAX_NODES;
            walk(walker, &win, Vec::new(), &mut budget)
        })
    })
}

/// Tìm element theo (cửa sổ, đường dẫn) rồi chạy `f` trên nó.
fn on_element<T>(
    runtime_id: Vec<i32>,
    path: Vec<usize>,
    f: impl FnOnce(&UIElement) -> uiautomation::Result<T>,
) -> Result<T, String> {
    let found = with_uia(|walker, root| {
        find_window(walker, root, &runtime_id).and_then(|win| find_by_path(walker, &win, &path))
    })
    .map_err(|e| e.to_string())?;

    let element = found.ok_or("Element không còn tồn tại, hãy soi lại cửa sổ")?;
    f(&element).map_err(|e| e.to_string())
}

fn describe(el: &UIElement) -> ElementDetail {
    let mut actions = Vec::new();
    if el.get_pattern::<UIInvokePattern>().is_ok() {
        actions.push("invoke".to_string());
    }
    let toggle = el.get_pattern::<UITogglePattern>().ok();
    if toggle.is_some() {
        actions.push("toggle".to_string());
    }
    let value_pattern = el.get_pattern::<UIValuePattern>().ok();
    let readonly = value_pattern
        .as_ref()
        .and_then(|p| p.is_readonly().ok())
        .unwrap_or(true);
    if value_pattern.is_some() && !readonly {
        actions.push("value".to_string());
    }
    if el.is_keyboard_focusable().unwrap_or(false) {
        actions.push("focus".to_string());
    }

    ElementDetail {
        name: el.get_name().unwrap_or_default(),
        automation_id: el.get_automation_id().unwrap_or_default(),
        classname: el.get_classname().unwrap_or_default(),
        control_type: el
            .get_control_type()
            .map(|t| format!("{t:?}"))
            .unwrap_or_default(),
        enabled: el.is_enabled().unwrap_or(false),
        offscreen: el.is_offscreen().unwrap_or(false),
        value: value_pattern.and_then(|p| p.get_value().ok()),
        readonly,
        toggle_state: toggle
            .and_then(|p| p.get_toggle_state().ok())
            .map(|s| format!("{s:?}")),
        actions,
    }
}

fn perform(el: &UIElement, action: &str, text: &str) -> uiautomation::Result<String> {
    let done = |msg: &str| msg.to_string();
    match action {
        "invoke" => el
            .get_pattern::<UIInvokePattern>()?
            .invoke()
            .map(|_| done("Đã gọi Invoke")),
        "toggle" => el
            .get_pattern::<UITogglePattern>()?
            .toggle()
            .map(|_| done("Đã đổi trạng thái")),
        "value" => el
            .get_pattern::<UIValuePattern>()?
            .set_value(text)
            .map(|_| done("Đã đặt giá trị")),
        "focus" => el.set_focus().map(|_| done("Đã focus")),
        // send_keys tự focus trước khi gõ, nên không cần gọi set_focus ở đây.
        // 20ms giữa các phím: gõ quá nhanh thì nhiều app bỏ sót ký tự.
        "keys" => el.send_keys(text, 20).map(|_| done("Đã gửi phím")),
        _ => Err(uiautomation::Error::new(-1, "Hành động không hợp lệ")),
    }
}

/// Crate uiautomation chỉ ghi PNG ra file, nên tự mã hoá trong bộ nhớ để khỏi đụng đĩa.
fn encode_png(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let mut out = Vec::new();
    let mut encoder = png::Encoder::new(&mut out, width, height);
    encoder.set_color(png::ColorType::Rgba);
    encoder.set_depth(png::BitDepth::Eight);
    let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
    writer.write_image_data(rgba).map_err(|e| e.to_string())?;
    writer.finish().map_err(|e| e.to_string())?;
    Ok(out)
}

/// Ảnh BGRA top-down của cả một cửa sổ.
struct WindowShot {
    pixels: Vec<u8>,
    width: i32,
    height: i32,
    left: i32,
    top: i32,
}

/// Bảo chính cửa sổ tự vẽ vào bitmap thay vì copy pixel màn hình, nhờ vậy
/// cửa sổ bị che vẫn chụp ra đúng nội dung của nó.
fn print_window(hwnd: HWND) -> Result<WindowShot, String> {
    unsafe {
        let mut rect = RECT::default();
        GetWindowRect(hwnd, &mut rect).map_err(|e| e.to_string())?;
        let (width, height) = (rect.right - rect.left, rect.bottom - rect.top);
        if width <= 0 || height <= 0 {
            return Err("Cửa sổ không có kích thước hiển thị".into());
        }

        let screen = GetDC(None);
        let mem = CreateCompatibleDC(Some(screen));
        let bitmap = CreateCompatibleBitmap(screen, width, height);
        let previous = SelectObject(mem, bitmap.into());

        // PW_RENDERFULLCONTENT là cờ duy nhất lấy được nội dung của cửa sổ vẽ bằng GPU
        let drawn = PrintWindow(hwnd, mem, PRINT_WINDOW_FLAGS(PW_RENDERFULLCONTENT)).as_bool();

        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // âm = thứ tự dòng từ trên xuống
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut pixels = vec![0u8; (width as usize) * (height as usize) * 4];
        let lines = GetDIBits(
            mem,
            bitmap,
            0,
            height as u32,
            Some(pixels.as_mut_ptr().cast()),
            &mut info,
            DIB_RGB_COLORS,
        );

        SelectObject(mem, previous);
        let _ = DeleteObject(bitmap.into());
        let _ = DeleteDC(mem);
        ReleaseDC(None, screen);

        if !drawn || lines == 0 {
            return Err("PrintWindow không vẽ được cửa sổ này".into());
        }
        // Bề mặt shell của Windows (thanh tác vụ, Start) báo thành công nhưng để lại
        // khung trống. Coi dưới 1% pixel khác màu là không vẽ được.
        let (groups, _) = pixels.as_chunks::<4>();
        let khac_mau = groups.iter().filter(|px| **px != groups[0]).count();
        if khac_mau * 100 < groups.len() {
            return Err("Cửa sổ này không trả về nội dung qua PrintWindow. Thường gặp ở \
                        thanh tác vụ và các bề mặt shell khác của Windows."
                .into());
        }
        Ok(WindowShot {
            pixels,
            width,
            height,
            left: rect.left,
            top: rect.top,
        })
    }
}

/// Cắt vùng element ra khỏi ảnh cửa sổ và đổi BGRA sang RGBA.
fn crop_to_rgba(shot: &WindowShot, rect: &Rect) -> Result<(Vec<u8>, u32, u32), String> {
    let x0 = (rect.get_left() - shot.left).clamp(0, shot.width);
    let y0 = (rect.get_top() - shot.top).clamp(0, shot.height);
    let x1 = (rect.get_right() - shot.left).clamp(x0, shot.width);
    let y1 = (rect.get_bottom() - shot.top).clamp(y0, shot.height);
    let (cw, ch) = ((x1 - x0) as usize, (y1 - y0) as usize);
    if cw == 0 || ch == 0 {
        return Err("Element nằm ngoài vùng nhìn thấy của cửa sổ".into());
    }

    let stride = shot.width as usize * 4;
    let mut out = Vec::with_capacity(cw * ch * 4);
    for row in 0..ch {
        let start = (y0 as usize + row) * stride + x0 as usize * 4;
        for px in 0..cw {
            let p = start + px * 4;
            // PrintWindow thường trả alpha = 0, ép đục để ảnh không trong suốt hết
            out.extend_from_slice(&[shot.pixels[p + 2], shot.pixels[p + 1], shot.pixels[p], 255]);
        }
    }
    Ok((out, cw as u32, ch as u32))
}

fn capture(runtime_id: Vec<i32>, path: Vec<usize>) -> Result<Vec<u8>, String> {
    let found = with_uia(|walker, root| {
        let window = find_window(walker, root, &runtime_id)?;
        let element = find_by_path(walker, &window, &path)?;
        Some((
            window.get_native_window_handle().ok()?,
            element.get_bounding_rectangle().ok()?,
        ))
    })
    .map_err(|e| e.to_string())?;
    let (handle, rect) = found.ok_or("Element không còn tồn tại, hãy soi lại cửa sổ")?;

    // Cố ý không lùi về cách chụp màn hình: nó copy pixel đang hiển thị nên
    // cửa sổ bị che sẽ ra ảnh của cửa sổ che nó, sai mà trông như đúng.
    let shot = print_window(handle.into())?;
    let (rgba, width, height) = crop_to_rgba(&shot, &rect)?;
    encode_png(&rgba, width, height)
}

#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    tauri::async_runtime::spawn_blocking(collect_windows)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inspect_window(runtime_id: Vec<i32>) -> Result<Node, String> {
    tauri::async_runtime::spawn_blocking(move || build_tree(runtime_id))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Cửa sổ không còn tồn tại, hãy tải lại danh sách".into())
}

#[tauri::command]
pub async fn describe_element(
    runtime_id: Vec<i32>,
    path: Vec<usize>,
) -> Result<ElementDetail, String> {
    tauri::async_runtime::spawn_blocking(move || on_element(runtime_id, path, |el| Ok(describe(el))))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn run_action(
    runtime_id: Vec<i32>,
    path: Vec<usize>,
    action: String,
    text: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        on_element(runtime_id, path, |el| perform(el, &action, &text))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn capture_element(
    runtime_id: Vec<i32>,
    path: Vec<usize>,
) -> Result<tauri::ipc::Response, String> {
    tauri::async_runtime::spawn_blocking(move || capture(runtime_id, path))
        .await
        .map_err(|e| e.to_string())?
        .map(tauri::ipc::Response::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Cần một phiên desktop thật đang chạy; CI headless sẽ không thấy cửa sổ nào.
    #[test]
    fn doc_duoc_danh_sach_va_cay() {
        let windows = collect_windows().expect("gọi được UI Automation");
        assert!(!windows.is_empty(), "phải thấy ít nhất một cửa sổ có tiêu đề");

        let tree = build_tree(windows[0].runtime_id.clone())
            .expect("duyệt được cây")
            .expect("cửa sổ vẫn còn tồn tại");
        assert!(!tree.control_type.is_empty(), "node gốc phải có control type");
        assert!(tree.path.is_empty(), "node gốc có đường dẫn rỗng");
    }

    /// Đường dẫn trong cây phải trỏ lại đúng element khi tra ngược.
    #[test]
    fn duong_dan_tro_lai_dung_element() {
        let windows = collect_windows().expect("gọi được UI Automation");
        let win = windows
            .iter()
            .find(|w| {
                build_tree(w.runtime_id.clone())
                    .ok()
                    .flatten()
                    .is_some_and(|t| !t.children.is_empty())
            })
            .expect("phải có cửa sổ nào đó còn phần tử con");

        let tree = build_tree(win.runtime_id.clone()).unwrap().unwrap();
        let child = &tree.children[0];
        assert_eq!(child.path, vec![0]);

        let detail = on_element(win.runtime_id.clone(), child.path.clone(), |el| {
            Ok(describe(el))
        })
        .expect("tra ngược được element");
        assert_eq!(detail.control_type, child.control_type);
        assert_eq!(detail.automation_id, child.automation_id);
    }

    /// Thanh tác vụ và vài bề mặt shell không chụp được, nên chỉ đòi hỏi
    /// có ít nhất một cửa sổ ứng dụng cho ra ảnh thật.
    #[test]
    fn chup_duoc_it_nhat_mot_cua_so_ra_png_co_noi_dung() {
        let windows = collect_windows().expect("gọi được UI Automation");
        let mut loi = Vec::new();

        for w in &windows {
            let png = match capture(w.runtime_id.clone(), Vec::new()) {
                Ok(png) => png,
                Err(e) => {
                    loi.push(format!("{}: {e}", w.classname));
                    continue;
                }
            };
            assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n", "8 byte đầu phải là chữ ký PNG");

            let decoder = png::Decoder::new(std::io::Cursor::new(&png));
            let mut reader = decoder.read_info().expect("PNG đọc được");
            let mut pixels = vec![0u8; reader.output_buffer_size().expect("biết được cỡ buffer")];
            let info = reader.next_frame(&mut pixels).expect("đọc được khung ảnh");
            assert!(info.width > 0 && info.height > 0, "ảnh phải có kích thước");

            let (groups, _) = pixels.as_chunks::<4>();
            if groups.iter().any(|px| px != &groups[0]) {
                return; // có một cửa sổ cho ảnh nhiều màu là đủ
            }
        }

        panic!("không cửa sổ nào chụp ra ảnh có nội dung. Lý do: {loi:?}");
    }

    #[test]
    fn runtime_id_khong_khop_thi_tra_none() {
        assert!(build_tree(vec![-1, -1, -1]).expect("không panic").is_none());
    }

    #[test]
    fn hanh_dong_la_thi_bao_loi_chu_khong_panic() {
        let windows = collect_windows().unwrap();
        let err = on_element(windows[0].runtime_id.clone(), vec![], |el| {
            perform(el, "khong-co-that", "")
        })
        .unwrap_err();
        assert!(err.contains("không hợp lệ"), "nhận được: {err}");
    }

    /// Chính là kịch bản React.StrictMode gọi list_windows hai lần cùng lúc.
    #[test]
    fn hai_luong_cung_doc_van_chay() {
        let a = std::thread::spawn(collect_windows);
        let b = std::thread::spawn(collect_windows);
        assert!(a.join().unwrap().is_ok(), "luồng A phải đọc được");
        assert!(b.join().unwrap().is_ok(), "luồng B phải đọc được");
    }
}

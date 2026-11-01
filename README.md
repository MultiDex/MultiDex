<img src="src-tauri/icons/icon.svg" alt="" width="96" height="96" />

# \<Win\>Dex

[![Build](https://github.com/MultiDex/MultiDex/actions/workflows/build.yml/badge.svg)](https://github.com/MultiDex/MultiDex/actions/workflows/build.yml)

Soi cây UI Automation của mọi cửa sổ Windows đang mở, để lấy `AutomationId` và `ControlType` khi viết script automation / RPA. Chạy hoàn toàn offline, giao diện theo Fluent 2 / Windows 11, dựng bằng Tauri 2 + React + TypeScript.

Khác với app web, phần mềm native (Win32, WPF, WinForms, UWP) không có DevTools. Thứ thay thế là **UI Automation** — cây phần tử do chính Windows dựng, vốn phục vụ screen reader, và cũng là nền tảng của pywinauto, FlaUI, Playwright for Windows. \<Win\>Dex đọc cây đó.

## Tính năng

- **Chộp element dưới con trỏ bằng `Ctrl+Alt+I`** — rê chuột lên control bất kỳ của app nào rồi bấm, WinDex tự mở đúng cửa sổ và chọn đúng node. Phím tắt toàn cục, không cần WinDex đang hoạt động
- **Khung đỏ vẽ lên element** đang chọn, chuột xuyên qua được nên không chặn thao tác
- **Tìm trong cây** theo Name, AutomationId, ControlType — chỉ hiện nhánh có kết quả
- **Pane cửa sổ bên trái**: liệt kê cửa sổ top-level đang mở kèm class name và process id, có ô lọc theo tên/class/pid; bấm một cửa sổ là soi ngay
- **Khu làm việc bên phải**: cây UI Automation và bảng thao tác của element đang chọn
- Duyệt **toàn bộ** cây UI Automation, có trần an toàn 500 node mỗi cấp và 20.000 node cho cả cây
- Mỗi node hiện `ControlType`, `Name`, `AutomationId`; rê chuột xem class name và kích thước
- Bấm vào `AutomationId` để sao chép thẳng vào script
- **Thao tác được với element đang chọn**, tuỳ theo pattern mà nó hỗ trợ:
  - `Invoke` — bấm nút
  - `Toggle` — bật/tắt checkbox
  - `Đặt giá trị` — ghi text vào ô nhập (Value pattern, không read-only)
  - `Focus` — đưa con trỏ vào element
  - `Gửi phím` — focus rồi gõ thật, hỗ trợ `{enter}`, `{tab}`, `{esc}`
- **Chụp ảnh element** đang chọn (PNG, đúng vùng bounding rectangle). Dùng `PrintWindow` nên **không cần đưa cửa sổ ra trước, không cướp chuột hay focus**
- **Sinh sẵn đoạn mã cho 4 hệ**: Python `uiautomation`, Python `pywinauto`, C# `FlaUI` và PowerShell — chọn trong danh sách rồi copy
- **Xuất cả cây ra JSON** để diff giữa hai lần chạy, biết app đổi gì sau khi cập nhật
- **Nhật ký focus**: theo dõi mỗi lần focus bàn phím chuyển sang element khác, xem app phản ứng gì khi thao tác
- **Mở lại với quyền admin** ngay trong app khi cần soi app chạy elevated
- Giao diện Sáng / Tối / theo hệ thống, áp dụng trước lần vẽ đầu nên không bị nháy
- Thanh tiêu đề tự vẽ: kéo cửa sổ, double-click để phóng to, nút thu nhỏ / phóng to / đóng

### Phím tắt

| Thao tác                  | Phím           |
| ------------------------- | -------------- |
| Chộp element dưới con trỏ | `Ctrl+Alt+I`   |
| Đổi giao diện Sáng ↔ Tối  | `Ctrl+Shift+L` |
| Quay lại                  | `Alt+←`        |

## Tải về

Tải bản mới nhất ở trang [Releases](https://github.com/MultiDex/MultiDex/releases/latest). Mỗi lần push lên `main` tạo một release mới tên `v<phiên bản>-build.<số>`, gồm:

- `WinDex_<phiên bản>_x64-portable.exe` — chạy ngay, không cần cài.
- `WinDex_<phiên bản>_x64-setup.exe` — bộ cài, có shortcut Start menu và mục gỡ cài đặt.

Pull request vào `main` cũng được build nhưng không tạo release; file nằm ở mục **Artifacts** của lần chạy trong tab [Actions](https://github.com/MultiDex/MultiDex/actions/workflows/build.yml).

Ghi chú:

- File chưa được ký số, nên lần đầu mở Windows SmartScreen sẽ cảnh báo. Chọn **More info → Run anyway**.
- Cần Microsoft Edge WebView2 Runtime. Windows 11 có sẵn; bộ cài tự tải về trên Windows 10 nếu thiếu.

## Phát triển

### Yêu cầu

- [Node.js](https://nodejs.org/) 24
- [Rust](https://rustup.rs/) stable (>= 1.85, vì crate dùng edition 2024)
- Visual Studio hoặc Build Tools với workload **Desktop development with C++**, và WebView2
- Chỉ chạy được trên Windows — UI Automation là API riêng của Windows

### Lệnh

```sh
npm install
```

| Lệnh                                              | Việc làm                                               |
| ------------------------------------------------- | ------------------------------------------------------ |
| `npm run tauri dev`                               | Chạy app trong cửa sổ desktop, tự tải lại khi sửa code |
| `npm run dev`                                     | Chạy giao diện trên trình duyệt tại `localhost:1420`   |
| `npm run tauri build`                             | Build bản phát hành (exe + bộ cài)                     |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Chạy test Rust (cần phiên desktop thật)                |
| `npm run format`                                  | Format code bằng Prettier                              |
| `npm run format:check`                            | Kiểm tra format, không sửa file                        |

`npm run dev` mở trong trình duyệt nên **không gọi được UI Automation** — app sẽ báo cần chạy trong cửa sổ desktop. Dùng `npm run tauri dev` để thử thật.

Lần đầu `npm run tauri dev` hoặc `npm run tauri build` mất vài phút để biên dịch Rust; các lần sau nhanh hơn nhiều.

### Kết quả build

| File                                                      | Dùng để     |
| --------------------------------------------------------- | ----------- |
| `src-tauri/target/release/windex.exe`                     | Chạy ngay   |
| `src-tauri/target/release/bundle/nsis/WinDex_*-setup.exe` | Bộ cài NSIS |
| `src-tauri/target/release/bundle/msi/WinDex_*.msi`        | Bộ cài MSI  |

## Cấu trúc thư mục

```text
.
├── .github/workflows/build.yml   CI: build bản Windows, tạo release khi push lên main
├── index.html                    Script đặt theme trước lần vẽ đầu
├── src/
│   ├── App.tsx                   Khung app: 2 trang theo hash, phím tắt, theme, toast
│   ├── components/
│   │   ├── TitleBar.tsx          Thanh tiêu đề tự vẽ, nút theme và cài đặt
│   │   └── SettingRow.tsx        SettingRow, Seg, Combo
│   ├── pages/
│   │   ├── WindowInspector.tsx   Trang chính: chọn cửa sổ, vẽ cây UIA
│   │   └── Settings.tsx          Giao diện và giới thiệu
│   ├── lib/theme.ts              Sáng / Tối / theo hệ thống
│   └── styles/                   tokens.css, bundle.css, app.css
└── src-tauri/
    ├── src/inspector.rs          Đọc cây UI Automation, 2 Tauri command
    ├── src/lib.rs                Dựng app, đăng ký command
    └── capabilities/             Quyền của cửa sổ chính
```

### Thêm Tauri command

Gắn `#[tauri::command]` lên hàm rồi đăng ký trong `generate_handler!` ở [`lib.rs`](src-tauri/src/lib.rs). Command của app không bị ACL quản, nên không cần sửa `capabilities/` — chỉ lệnh của plugin và của core mới cần.

Việc đọc UI Automation phải chạy trong `spawn_blocking`: nó chặn luồng, và COM trả `E_FAIL` nếu nhiều luồng cùng khởi tạo (xem `UIA_LOCK` trong [`inspector.rs`](src-tauri/src/inspector.rs)).

## Giao diện

- `src/styles/tokens.css` — token màu, khoảng cách, bo góc, bóng theo tên theme resource của WinUI (`text-primary`, `fill-accent-default`, `bg-card`…). Theme đổi bằng thuộc tính `data-theme` trên `<html>`.
- `src/styles/bundle.css` — style component, lớp có tiền tố `dx-`.
- `src/styles/app.css` — phần bố cục riêng của app.
- Mọi màu đều lấy từ token, không viết mã màu cứng, để cả hai theme luôn đúng.
- Font: Segoe UI Variable (có sẵn trên Windows, không đóng gói) và Cascadia Mono (đóng gói). Icon: Fluent System Icons.
- Logo app: nguồn là `src-tauri/icons/icon.svg`, `public/favicon.svg` là bản sao dùng cho tab trình duyệt. Sửa logo xong thì chạy `npx tauri icon src-tauri/icons/icon.svg` để sinh lại các file `.ico`, `.icns`, `.png`, rồi xoá thư mục `android/` và `ios/` lệnh này tạo thêm. Cargo không tự build lại khi chỉ có icon đổi, nên trước lần build kế tiếp chạy `cargo clean --manifest-path src-tauri/Cargo.toml -p windex` để exe nhận icon mới.

## Hạn chế đã biết

- **App chạy quyền admin không hiện trong danh sách** trừ khi <Win>Dex cũng chạy admin — dùng nút **Mở lại với quyền admin** ngay trong app.
- **Thanh tác vụ và vài bề mặt shell khác của Windows không chụp được.** Ảnh dùng `PrintWindow`, bảo chính cửa sổ tự vẽ ra bitmap nên cửa sổ bị che vẫn chụp đúng; riêng các bề mặt shell trả về khung trống, lúc đó app báo lỗi thay vì đưa ra ảnh sai.
- Cây lấy hết các cấp, nhưng có hai trần an toàn: tối đa **500 node mỗi cấp** và **20.000 node cho cả cây**. Chạm trần thì node đó hiện dòng `… đã cắt bớt`.
- **Thao tác tác động thật lên app đích.** `Gửi phím` focus element rồi gõ vào đó như người dùng; gõ nhầm cửa sổ là mất dữ liệu thật. Soi kỹ trước khi bấm.
- Cây không tự cập nhật sau khi thao tác; nếu app đổi giao diện thì bấm **Soi cửa sổ** lại.
- Phần tử vẽ tay bằng DirectX hoặc app Java cũ có thể không xuất hiện trong cây UIA. Lúc đó cần công cụ ở tầng thấp hơn như Spy++.
- Chưa có hiệu ứng nền Mica, Snap Layouts và màu nhấn theo Windows (cả ba cần thêm code Rust).
- ToolTip đang dùng thuộc tính `title` của trình duyệt.

## Giấy phép bên thứ ba

- [Cascadia Mono](https://github.com/microsoft/cascadia-code) — SIL Open Font License 1.1
- [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) — MIT
- [uiautomation-rs](https://crates.io/crates/uiautomation) — Apache-2.0
- [Tauri](https://tauri.app/) — MIT / Apache-2.0

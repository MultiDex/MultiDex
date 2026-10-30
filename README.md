# \<Hex\>Dex

Prototype giao diện cho \<Hex\>Dex — app desktop (Tauri + React + TypeScript) gom các công cụ nhỏ của developer, giao diện theo Fluent 2 / Windows 11. Đây chỉ là UI: mọi công cụ hiển thị dữ liệu mẫu cố định, chưa có logic xử lý hay Rust command. Font: Segoe UI Variable (có sẵn trên Windows) và Cascadia Mono (đóng gói); icon: Fluent System Icons (`@fluentui/react-icons`).

## Chạy

```sh
npm install
npm run dev         # giao diện trên trình duyệt: http://localhost:1420
npm run tauri dev   # cửa sổ desktop (cần Rust + Visual Studio "Desktop development with C++")
npm test            # test highlighter
```

## Cấu trúc

- `src/styles/tokens.css` — sinh từ `tokens.json` của design system; `bundle.css` — copy nguyên từ design system (lớp `dx-*`); `app.css` — bổ sung bố cục.
- `src/data/tools.ts` — danh sách công cụ và dữ liệu mẫu.
- `src/components/`, `src/pages/` — TitleBar, Sidebar, ToolCard, CodePanel, SettingRow; trang Home, ToolPage, Settings.
- `src-tauri/` — khung Tauri mặc định; chỉ chỉnh `tauri.conf.json` (cửa sổ không viền 1280×800) và quyền cửa sổ trong `capabilities/default.json`.

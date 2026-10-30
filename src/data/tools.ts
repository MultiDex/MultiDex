import {
  ArrowSwapRegular,
  BracesRegular,
  ClockRegular,
  CodeRegular,
  ColorRegular,
  FingerprintRegular,
  GlobeRegular,
  HourglassRegular,
  KeyRegular,
  LinkRegular,
  LockClosedRegular,
  NumberSymbolRegular,
  SparkleRegular,
  TextAsteriskRegular,
  TextCaseUppercaseRegular,
  TextFontRegular,
  TextIndentIncreaseRegular,
  TextSortAscendingRegular,
  type FluentIcon,
} from "@fluentui/react-icons";

type Base = { title: string; desc: string; icon: FluentIcon };
export type Option =
  | (Base & { kind: "seg"; items: string[]; value: number })
  | (Base & { kind: "switch"; on: boolean })
  | (Base & { kind: "input"; value: string; placeholder?: string });

export type Panel = { text: string; json?: boolean; ok?: string };

export type Tool = {
  id: string;
  name: string;
  desc: string;
  icon: FluentIcon;
  category: string;
  aliases: string[];
  isNew?: boolean;
  dot?: boolean;
  action?: string;
  modes?: string[];
  info?: { title: string; text: string };
  options: Option[];
  input?: Panel;
  output: Panel;
};

export const categories: { name: string; icon: FluentIcon }[] = [
  { name: "Converters", icon: ArrowSwapRegular },
  { name: "Encoders / Decoders", icon: CodeRegular },
  { name: "Text", icon: TextFontRegular },
  { name: "Generators", icon: SparkleRegular },
];

const ENC = ["Mã hoá", "Giải mã"];

export const tools: Tool[] = [
  {
    id: "json-formatter",
    name: "JSON Formatter",
    desc: "Định dạng, thu gọn và kiểm tra dữ liệu JSON",
    icon: BracesRegular,
    category: "Text",
    aliases: ["json", "format", "pretty"],
    options: [
      {
        kind: "seg",
        icon: TextIndentIncreaseRegular,
        title: "Thụt lề",
        desc: "Số khoảng trắng cho mỗi cấp lồng nhau",
        items: ["2 dấu cách", "4 dấu cách", "Tab", "Thu gọn"],
        value: 0,
      },
      {
        kind: "switch",
        icon: TextSortAscendingRegular,
        title: "Sắp xếp khoá",
        desc: "Sắp xếp khoá theo bảng chữ cái ở mọi cấp",
        on: true,
      },
    ],
    input: {
      text: '{"name":"dex","id":42,"beta":false}',
      json: true,
      ok: "JSON hợp lệ",
    },
    output: {
      text: '{\n  "beta": false,\n  "id": 42,\n  "name": "dex"\n}',
      json: true,
    },
  },
  {
    id: "jwt-decoder",
    name: "JWT Decoder",
    desc: "Giải mã header, payload và kiểm tra chữ ký token",
    icon: KeyRegular,
    category: "Encoders / Decoders",
    aliases: ["jwt", "token", "bearer"],
    dot: true,
    info: {
      title: "Chưa kiểm tra chữ ký",
      text: "Nhập khoá bí mật bên trên để xác minh token.",
    },
    options: [
      {
        kind: "input",
        icon: LockClosedRegular,
        title: "Khoá bí mật",
        desc: "Dùng để xác minh chữ ký HS256",
        value: "",
        placeholder: "multidex-secret",
      },
      {
        kind: "switch",
        icon: ClockRegular,
        title: "Hiện thời gian dễ đọc",
        desc: "Đổi iat, exp sang ngày giờ địa phương",
        on: true,
      },
    ],
    input: {
      text: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1XzEwMjQiLCJuYW1lIjoiTmd1eeG7hW4gVsSDbiBBbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc5MzM0NzIwMCwiZXhwIjoxNzkzNDMzNjAwfQ.dDZYgq7icVXRHJ4yFED4db9bU2MbiYpQC3uinAL0LqU",
      ok: "JWT hợp lệ · HS256",
    },
    output: {
      text: '// Header\n{\n  "alg": "HS256",\n  "typ": "JWT"\n}\n\n// Payload\n{\n  "sub": "u_1024",\n  "name": "Nguyễn Văn An",\n  "role": "admin",\n  "iat": 1793347200, // 30/10/2026 15:00:00\n  "exp": 1793433600  // 31/10/2026 15:00:00\n}',
      json: true,
    },
  },
  {
    id: "base64-text",
    name: "Base64 Text",
    desc: "Mã hoá và giải mã chuỗi Base64",
    icon: CodeRegular,
    category: "Encoders / Decoders",
    aliases: ["b64", "base64"],
    modes: ENC,
    options: [
      {
        kind: "switch",
        icon: LinkRegular,
        title: "URL-safe",
        desc: "Dùng - và _ thay cho + và /, bỏ dấu = ở cuối",
        on: false,
      },
    ],
    input: { text: "Xin chào <Multi>Dex" },
    output: { text: "WGluIGNow6BvIDxNdWx0aT5EZXg=" },
  },
  {
    id: "url-encoder",
    name: "URL Encoder",
    desc: "Mã hoá và giải mã thành phần URL",
    icon: LinkRegular,
    category: "Encoders / Decoders",
    aliases: ["url", "percent", "uri"],
    modes: ENC,
    options: [
      {
        kind: "seg",
        icon: GlobeRegular,
        title: "Phạm vi",
        desc: "Mã hoá một thành phần hay giữ nguyên cấu trúc URL",
        items: ["Thành phần", "Toàn bộ URL"],
        value: 0,
      },
    ],
    input: { text: "https://multidex.dev/search?q=giải mã jwt&lang=vi" },
    output: {
      text: "https%3A%2F%2Fmultidex.dev%2Fsearch%3Fq%3Dgi%E1%BA%A3i%20m%C3%A3%20jwt%26lang%3Dvi",
    },
  },
  {
    id: "regex-tester",
    name: "Regex Tester",
    desc: "Thử biểu thức chính quy với dữ liệu mẫu",
    icon: TextAsteriskRegular,
    category: "Text",
    aliases: ["regex", "regexp", "re"],
    options: [
      {
        kind: "input",
        icon: TextAsteriskRegular,
        title: "Biểu thức",
        desc: "Cú pháp JavaScript",
        value: "[\\w.+-]+@([\\w-]+\\.)+\\w+",
      },
      {
        kind: "switch",
        icon: TextCaseUppercaseRegular,
        title: "Không phân biệt hoa thường",
        desc: "Cờ i",
        on: false,
      },
      {
        kind: "switch",
        icon: GlobeRegular,
        title: "Tìm tất cả",
        desc: "Cờ g",
        on: true,
      },
    ],
    input: {
      text: "Liên hệ: an.nguyen@multidex.dev\nHỗ trợ: support@multidex.dev, sales@example.com\nSai định dạng: an@@multidex",
      ok: "3 kết quả",
    },
    output: {
      text: "1  an.nguyen@multidex.dev   Ln 1, Col 10\n2  support@multidex.dev     Ln 2, Col 9\n3  sales@example.com        Ln 2, Col 31",
    },
  },
  {
    id: "cron-parser",
    name: "Cron Parser",
    desc: "Giải thích biểu thức cron và các lần chạy kế tiếp",
    icon: ClockRegular,
    category: "Converters",
    aliases: ["cron", "crontab", "schedule"],
    options: [
      {
        kind: "seg",
        icon: HourglassRegular,
        title: "Định dạng",
        desc: "Số trường của biểu thức",
        items: ["5 trường", "6 trường (có giây)"],
        value: 0,
      },
      {
        kind: "input",
        icon: GlobeRegular,
        title: "Múi giờ",
        desc: "Dùng để tính các lần chạy kế tiếp",
        value: "Asia/Ho_Chi_Minh",
      },
    ],
    input: { text: "*/15 9-17 * * 1-5", ok: "Biểu thức hợp lệ" },
    output: {
      text: "Mỗi 15 phút, từ 09:00 đến 17:59, thứ Hai đến thứ Sáu\n\nLần chạy kế tiếp\n  Thứ Sáu 30/10/2026  16:15\n  Thứ Sáu 30/10/2026  16:30\n  Thứ Sáu 30/10/2026  16:45\n  Thứ Sáu 30/10/2026  17:00\n  Thứ Sáu 30/10/2026  17:15",
    },
  },
  {
    id: "hash-generator",
    name: "Hash Generator",
    desc: "Tính MD5, SHA-1, SHA-256 cho văn bản hoặc tệp",
    icon: NumberSymbolRegular,
    category: "Generators",
    aliases: ["hash", "md5", "sha", "sha256"],
    options: [
      {
        kind: "seg",
        icon: NumberSymbolRegular,
        title: "Định dạng đầu ra",
        desc: "Cách biểu diễn giá trị hash",
        items: ["Hex", "Base64"],
        value: 0,
      },
      {
        kind: "switch",
        icon: TextCaseUppercaseRegular,
        title: "Viết hoa",
        desc: "In hoa các chữ cái a–f",
        on: false,
      },
    ],
    input: { text: "<Multi>Dex" },
    output: {
      text: "MD5      3c1d62c4b1d7ff0a4f858b5a6979b952\nSHA-1    bec667500444fe71f34fefc1ecac4771dbc10938\nSHA-256  5acde639af1c795f3e9c4d71e8c948c6dd043639c9eed1512eb0e8e8ce5f1570\nSHA-512  a3be3fc25a001df12226e26b6569b5e23c3134a5b053407f87ca99e4e24f55a28325a2151f285b8335bdf6eb20697633faa7d7f2422e93f805afce2b181b9392",
    },
  },
  {
    id: "uuid-generator",
    name: "UUID Generator",
    desc: "Tạo UUID v4 hoặc v7 hàng loạt",
    icon: FingerprintRegular,
    category: "Generators",
    aliases: ["uuid", "guid"],
    action: "Tạo lại",
    modes: ["v4", "v7"],
    options: [
      {
        kind: "input",
        icon: NumberSymbolRegular,
        title: "Số lượng",
        desc: "Từ 1 đến 1000",
        value: "5",
      },
      {
        kind: "switch",
        icon: TextCaseUppercaseRegular,
        title: "Viết hoa",
        desc: "In hoa các chữ cái a–f",
        on: false,
      },
      {
        kind: "switch",
        icon: TextFontRegular,
        title: "Bỏ dấu gạch",
        desc: "Xuất 32 ký tự liền nhau",
        on: false,
      },
    ],
    output: {
      text: "fb4640d5-a8d4-4719-8884-c2202a2323b2\nd70c8b14-297f-4b06-acf0-b81f0a58b2e2\nbfd75c4a-471c-4866-86fe-d7814909c24c\nceb02add-a61d-452f-920f-0b439bcaccc3\n7e1eae79-1293-487b-88c6-38da55e9be5d",
    },
  },
  {
    id: "color-converter",
    name: "Color Converter",
    desc: "Chuyển đổi HEX, RGB, HSL và OKLCH",
    icon: ColorRegular,
    category: "Converters",
    aliases: ["color", "hex", "rgb", "hsl", "oklch"],
    isNew: true,
    options: [
      {
        kind: "switch",
        icon: ColorRegular,
        title: "Hiện kênh alpha",
        desc: "Thêm độ trong suốt vào mọi định dạng",
        on: false,
      },
    ],
    input: { text: "#b6e35a", ok: "Màu hợp lệ" },
    output: {
      text: "HEX    #b6e35a\nRGB    rgb(182 227 90)\nHSL    hsl(80 71% 62%)\nOKLCH  oklch(85.7% 0.171 125.3)",
    },
  },
];

export const recentIds = ["json-formatter", "jwt-decoder", "base64-text"];

export const toolById = (id: string) => tools.find((t) => t.id === id);

export function searchTools(query: string) {
  const q = query.trim().toLowerCase();
  return tools.filter((t) => [t.name, t.desc, ...t.aliases].some((s) => s.toLowerCase().includes(q)));
}

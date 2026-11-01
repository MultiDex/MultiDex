import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwiseRegular,
  CameraRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CopyRegular,
  ImportantFilled,
  SearchRegular,
} from "@fluentui/react-icons";
import { invoke, isTauri } from "@tauri-apps/api/core";

type WindowInfo = { runtimeId: number[]; name: string; classname: string; processId: number };

type Node = {
  name: string;
  automationId: string;
  classname: string;
  controlType: string;
  rect: [number, number, number, number];
  path: number[];
  truncated: boolean;
  children: Node[];
};

type ElementDetail = {
  name: string;
  automationId: string;
  classname: string;
  controlType: string;
  enabled: boolean;
  offscreen: boolean;
  value: string | null;
  readonly: boolean;
  toggleState: string | null;
  actions: string[];
};

const keyOf = (w: WindowInfo) => JSON.stringify(w.runtimeId);
const pathKey = (p: number[]) => p.join("-");
const countNodes = (n: Node): number => 1 + n.children.reduce((sum, c) => sum + countNodes(c), 0);

const ACTION_LABEL: Record<string, string> = {
  invoke: "Invoke",
  toggle: "Toggle",
  focus: "Focus",
};

/** Chuỗi literal cho Python, nháy đơn */
const py = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** Sinh đoạn uiautomation (Python) trỏ đúng element đang chọn */
function pythonSnippet(win: WindowInfo | undefined, detail: ElementDetail, text: string, path: number[]) {
  const winArgs = [win?.classname && `ClassName=${py(win.classname)}`, win?.name && `Name=${py(win.name)}`].filter(
    Boolean,
  );

  // AutomationId là khoá bền nhất; không có thì lùi về Name rồi ClassName
  const elArgs = [
    detail.automationId && `AutomationId=${py(detail.automationId)}`,
    !detail.automationId && detail.name && `Name=${py(detail.name)}`,
    !detail.automationId && !detail.name && detail.classname && `ClassName=${py(detail.classname)}`,
  ].filter(Boolean);

  const action = detail.actions.includes("invoke")
    ? "el.Click()"
    : detail.actions.includes("toggle")
      ? "el.GetTogglePattern().Toggle()"
      : detail.actions.includes("value")
        ? `el.GetValuePattern().SetValue(${py(text)})`
        : text
          ? `el.SendKeys(${py(text)})`
          : "print(el.Name)";

  // path rỗng nghĩa là chính cửa sổ, khỏi đi tìm con cho thừa
  const locate =
    path.length === 0 ? "el = win" : `el = win.${detail.controlType || "Custom"}Control(${elArgs.join(", ")})`;

  return ["import uiautomation as auto", "", `win = auto.WindowControl(${winArgs.join(", ")})`, locate, action].join(
    "\n",
  );
}

type RowProps = {
  node: Node;
  level: number;
  selected: string;
  onSelect: (node: Node) => void;
  onCopy: (text: string) => void;
};

function TreeNode({ node, level, selected, onSelect, onCopy }: RowProps) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const [l, t, r, b] = node.rect;
  const on = selected === pathKey(node.path);
  return (
    <>
      <div
        className={`dx-uia__row${on ? " dx-uia__row--on" : ""}`}
        style={{ paddingLeft: 8 + level * 16 }}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node);
          }
        }}
      >
        <button
          className="dx-uia__twisty"
          aria-label={open ? "Thu gọn" : "Mở rộng"}
          aria-expanded={hasChildren ? open : undefined}
          disabled={!hasChildren}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {hasChildren &&
            (open ? <ChevronDownRegular className="dx-icon" /> : <ChevronRightRegular className="dx-icon" />)}
        </button>
        <span className="dx-uia__type">{node.controlType}</span>
        <span className="dx-uia__name" title={`${node.classname} · ${r - l}×${b - t} @ ${l},${t}`}>
          {node.name || "(không tên)"}
        </span>
        {node.automationId && (
          <button
            className="dx-uia__id"
            title="Sao chép AutomationId"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(node.automationId);
            }}
          >
            {node.automationId}
          </button>
        )}
      </div>
      {open &&
        node.children.map((child) => (
          <TreeNode
            key={pathKey(child.path)}
            node={child}
            level={level + 1}
            selected={selected}
            onSelect={onSelect}
            onCopy={onCopy}
          />
        ))}
      {open && node.truncated && (
        <div className="dx-uia__row dx-uia__more" style={{ paddingLeft: 8 + (level + 1) * 16 }}>
          … đã cắt bớt, cấp này có quá nhiều phần tử
        </div>
      )}
    </>
  );
}

export function WindowInspector({ onToast }: { onToast: (message: string) => void }) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedWindow, setSelectedWindow] = useState("");
  const [tree, setTree] = useState<Node | null>(null);
  const [node, setNode] = useState<Node | null>(null);
  const [detail, setDetail] = useState<ElementDetail | null>(null);
  const [shot, setShot] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Blob URL phải tự thu hồi, không thì rò bộ nhớ sau mỗi lần chụp
  useEffect(() => () => void (shot && URL.revokeObjectURL(shot)), [shot]);

  const currentWindow = windows.find((w) => keyOf(w) === selectedWindow);
  const q = filter.trim().toLowerCase();
  const shown = q
    ? windows.filter((w) => `${w.name} ${w.classname} ${w.processId}`.toLowerCase().includes(q))
    : windows;

  const loadWindows = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setWindows(await invoke<WindowInfo[]>("list_windows"));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isTauri()) void loadWindows();
  }, [loadWindows]);

  const clearSelection = () => {
    setNode(null);
    setDetail(null);
    setShot("");
  };

  const inspect = useCallback(async (windowKey: string) => {
    if (!windowKey) return;
    setBusy(true);
    setError("");
    clearSelection();
    try {
      setTree(await invoke<Node>("inspect_window", { runtimeId: JSON.parse(windowKey) }));
    } catch (e) {
      setTree(null);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const pickWindow = (w: WindowInfo) => {
    setSelectedWindow(keyOf(w));
    void inspect(keyOf(w));
  };

  const select = async (picked: Node) => {
    setNode(picked);
    setDetail(null);
    setShot("");
    try {
      const found = await invoke<ElementDetail>("describe_element", {
        runtimeId: JSON.parse(selectedWindow),
        path: picked.path,
      });
      setDetail(found);
      setText(found.value ?? "");
    } catch (e) {
      setError(String(e));
    }
  };

  const act = async (action: string) => {
    if (!node) return;
    setBusy(true);
    try {
      const message = await invoke<string>("run_action", {
        runtimeId: JSON.parse(selectedWindow),
        path: node.path,
        action,
        text,
      });
      onToast(message);
      await select(node);
    } catch (e) {
      onToast(String(e));
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    if (!node) return;
    setBusy(true);
    try {
      const png = await invoke<ArrayBuffer>("capture_element", {
        runtimeId: JSON.parse(selectedWindow),
        path: node.path,
      });
      setShot(URL.createObjectURL(new Blob([png], { type: "image/png" })));
    } catch (e) {
      onToast(String(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string, what = "Đã sao chép vào clipboard") => {
    navigator.clipboard?.writeText(value).catch(() => {});
    onToast(what);
  };

  if (!isTauri())
    return (
      <div className="dx-infobar dx-infobar--caution dx-stack" role="status">
        <span className="dx-sev dx-sev--caution">
          <ImportantFilled className="dx-icon" />
        </span>
        <div className="dx-infobar__text">
          <span className="dx-infobar__title">Cần chạy trong app desktop</span>
          Công cụ này đọc cây UI Automation của Windows, không chạy được trên trình duyệt. Dùng
          <code> npm run tauri dev</code>.
        </div>
      </div>
    );

  return (
    <div className="dx-wi">
      <aside className="dx-wi__nav" aria-label="Cửa sổ đang mở">
        <div className="dx-wi__navbar">
          <span className="dx-wi__navtitle">Cửa sổ · {windows.length}</span>
          <button
            className="dx-wi__iconbtn"
            aria-label="Tải lại danh sách"
            title="Tải lại danh sách"
            disabled={busy}
            onClick={() => void loadWindows()}
          >
            <ArrowClockwiseRegular className="dx-icon" />
          </button>
        </div>
        <div className="dx-wi__filter">
          <SearchRegular className="dx-icon" />
          <input
            className="dx-input"
            type="search"
            aria-label="Lọc cửa sổ"
            placeholder="Lọc theo tên, class, pid"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="dx-wi__list">
          {shown.length === 0 && <p className="dx-uia__empty">Không có cửa sổ nào khớp.</p>}
          {shown.map((w) => (
            <button
              key={keyOf(w)}
              className="dx-wi__item"
              aria-current={keyOf(w) === selectedWindow ? "true" : undefined}
              onClick={() => pickWindow(w)}
            >
              <span className="dx-wi__item-name">{w.name}</span>
              <span className="dx-wi__item-meta">
                {w.classname} · pid {w.processId}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="dx-wi__main">
        <div className="dx-wi__toolbar">
          <button className="dx-btn" disabled={busy || !selectedWindow} onClick={() => void inspect(selectedWindow)}>
            <ArrowClockwiseRegular className="dx-icon" />
            Soi lại
          </button>
          {tree && <span className="dx-wi__toolbar-hint">{countNodes(tree).toLocaleString("vi-VN")} node</span>}
        </div>

        {error && (
          <div className="dx-infobar dx-infobar--caution" role="status">
            <span className="dx-sev dx-sev--caution">
              <ImportantFilled className="dx-icon" />
            </span>
            <div className="dx-infobar__text">
              <span className="dx-infobar__title">Không đọc được</span>
              {error}
            </div>
          </div>
        )}

        {!tree && !error && (
          <p className="dx-uia__empty">{busy ? "Đang đọc…" : "Chọn một cửa sổ ở danh sách bên trái để bắt đầu."}</p>
        )}

        {tree && (
          <div className="dx-wi__work">
            <section className="dx-panel" aria-label="Cây UI Automation">
              <div className="dx-panel__bar">
                <span className="dx-panel__title">Cây UI Automation</span>
                <span className="dx-setting__desc">Bấm vào một node để thao tác</span>
              </div>
              <div className="dx-uia">
                <TreeNode
                  node={tree}
                  level={0}
                  selected={node ? pathKey(node.path) : ""}
                  onSelect={select}
                  onCopy={copy}
                />
              </div>
            </section>

            <section className="dx-panel" aria-label="Element đang chọn">
              <div className="dx-panel__bar">
                <span className="dx-panel__title">Element</span>
              </div>
              {!node ? (
                <p className="dx-uia__empty">Chưa chọn node nào.</p>
              ) : !detail ? (
                <p className="dx-uia__empty">Đang đọc…</p>
              ) : (
                <div className="dx-uia__detail">
                  <dl className="dx-uia__props">
                    <dt>ControlType</dt>
                    <dd>{detail.controlType}</dd>
                    <dt>Name</dt>
                    <dd>{detail.name || "—"}</dd>
                    <dt>AutomationId</dt>
                    <dd>{detail.automationId || "—"}</dd>
                    <dt>ClassName</dt>
                    <dd>{detail.classname || "—"}</dd>
                    <dt>Trạng thái</dt>
                    <dd>
                      {detail.enabled ? "Bật" : "Tắt"}
                      {detail.offscreen && " · ngoài màn hình"}
                      {detail.toggleState && ` · ${detail.toggleState}`}
                    </dd>
                    {detail.value !== null && (
                      <>
                        <dt>Value</dt>
                        <dd>
                          {detail.value || "—"}
                          {detail.readonly && " (chỉ đọc)"}
                        </dd>
                      </>
                    )}
                    <dt>Path</dt>
                    <dd>[{node.path.join(", ")}]</dd>
                  </dl>

                  <label className="dx-uia__field">
                    <span className="dx-setting__desc">Giá trị / phím gửi</span>
                    <input
                      className="dx-input"
                      value={text}
                      spellCheck={false}
                      placeholder="ví dụ: Xin chào{enter}"
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>

                  <div className="dx-uia__actions">
                    {detail.actions
                      .filter((a) => ACTION_LABEL[a])
                      .map((a) => (
                        <button key={a} className="dx-btn" disabled={busy} onClick={() => void act(a)}>
                          {ACTION_LABEL[a]}
                        </button>
                      ))}
                    {detail.actions.includes("value") && (
                      <button className="dx-btn" disabled={busy} onClick={() => void act("value")}>
                        Đặt giá trị
                      </button>
                    )}
                    <button className="dx-btn" disabled={busy || !text} onClick={() => void act("keys")}>
                      Gửi phím
                    </button>
                    <button className="dx-btn" disabled={busy} onClick={() => void capture()}>
                      <CameraRegular className="dx-icon" />
                      Chụp ảnh
                    </button>
                  </div>
                  <p className="dx-uia__hint">
                    Gửi phím sẽ focus element rồi gõ thật vào app đó. Cú pháp đặc biệt: <code>{"{enter}"}</code>,{" "}
                    <code>{"{tab}"}</code>, <code>{"{esc}"}</code>.
                  </p>

                  {shot && (
                    <figure className="dx-uia__shot">
                      <img src={shot} alt="Ảnh chụp element đang chọn" />
                    </figure>
                  )}

                  <div className="dx-uia__snippet">
                    <div className="dx-uia__snippet-bar">
                      <span className="dx-setting__desc">Python · uiautomation</span>
                      <button
                        className="dx-btn"
                        onClick={() =>
                          copy(pythonSnippet(currentWindow, detail, text, node.path), "Đã sao chép đoạn Python")
                        }
                      >
                        <CopyRegular className="dx-icon" />
                        Sao chép
                      </button>
                    </div>
                    <pre className="dx-uia__code">{pythonSnippet(currentWindow, detail, text, node.path)}</pre>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

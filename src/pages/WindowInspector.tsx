import { useCallback, useEffect, useState } from "react";
import {
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  CameraRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CopyRegular,
  ImportantFilled,
  SearchRegular,
} from "@fluentui/react-icons";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Combo } from "../components/SettingRow";
import { SNIPPETS } from "../lib/snippets";
import {
  captureElement,
  countNodes,
  describeElement,
  filterTree,
  hideHighlight,
  inspectWindow,
  isElevated,
  keyOf,
  listWindows,
  nodeAtPath,
  pathKey,
  relaunchAsAdmin,
  runAction,
  showHighlight,
  startFocusLog,
  stopFocusLog,
  type ElementDetail,
  type FocusEvent,
  type Located,
  type Node,
  type WindowInfo,
} from "../lib/uia";

const ACTION_LABEL: Record<string, string> = {
  invoke: "Invoke",
  toggle: "Toggle",
  focus: "Focus",
};

type RowProps = {
  node: Node;
  level: number;
  selected: string;
  forceOpen: boolean;
  onSelect: (node: Node) => void;
  onCopy: (text: string) => void;
};

function TreeNode({ node, level, selected, forceOpen, onSelect, onCopy }: RowProps) {
  const [open, setOpen] = useState(level < 2);
  const expanded = forceOpen || open;
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
          aria-label={expanded ? "Thu gọn" : "Mở rộng"}
          aria-expanded={hasChildren ? expanded : undefined}
          disabled={!hasChildren || forceOpen}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {hasChildren &&
            (expanded ? <ChevronDownRegular className="dx-icon" /> : <ChevronRightRegular className="dx-icon" />)}
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
      {expanded &&
        node.children.map((child) => (
          <TreeNode
            key={pathKey(child.path)}
            node={child}
            level={level + 1}
            selected={selected}
            forceOpen={forceOpen}
            onSelect={onSelect}
            onCopy={onCopy}
          />
        ))}
      {expanded && node.truncated && (
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
  const [treeQuery, setTreeQuery] = useState("");
  const [selectedWindow, setSelectedWindow] = useState("");
  const [tree, setTree] = useState<Node | null>(null);
  const [node, setNode] = useState<Node | null>(null);
  const [detail, setDetail] = useState<ElementDetail | null>(null);
  const [shot, setShot] = useState("");
  const [text, setText] = useState("");
  const [lang, setLang] = useState("0");
  const [boxOn, setBoxOn] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [elevated, setElevated] = useState(true);
  const [logOn, setLogOn] = useState(false);
  const [log, setLog] = useState<FocusEvent[]>([]);

  // Blob URL phải tự thu hồi, không thì rò bộ nhớ sau mỗi lần chụp
  useEffect(() => () => void (shot && URL.revokeObjectURL(shot)), [shot]);
  useEffect(() => () => void hideHighlight().catch(() => {}), []);

  const currentWindow = windows.find((w) => keyOf(w) === selectedWindow);
  const q = filter.trim().toLowerCase();
  const shownWindows = q
    ? windows.filter((w) => `${w.name} ${w.classname} ${w.processId}`.toLowerCase().includes(q))
    : windows;

  const tq = treeQuery.trim().toLowerCase();
  const shownTree = tree && tq ? filterTree(tree, tq) : tree;

  const loadWindows = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setWindows(await listWindows());
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void loadWindows();
    void isElevated()
      .then(setElevated)
      .catch(() => {});
  }, [loadWindows]);

  const clearSelection = useCallback(() => {
    setNode(null);
    setDetail(null);
    setShot("");
    void hideHighlight().catch(() => {});
  }, []);

  const inspect = useCallback(
    async (windowKey: string): Promise<Node | null> => {
      if (!windowKey) return null;
      setBusy(true);
      setError("");
      clearSelection();
      try {
        const next = await inspectWindow(JSON.parse(windowKey));
        setTree(next);
        return next;
      } catch (e) {
        setTree(null);
        setError(String(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [clearSelection],
  );

  const select = useCallback(
    async (picked: Node, windowKey = selectedWindow) => {
      setNode(picked);
      setDetail(null);
      setShot("");
      if (boxOn) void showHighlight(picked.rect).catch(() => {});
      try {
        const found = await describeElement(JSON.parse(windowKey), picked.path);
        setDetail(found);
        setText(found.value ?? "");
      } catch (e) {
        setError(String(e));
      }
    },
    [selectedWindow, boxOn],
  );

  // Phím tắt toàn cục Ctrl+Alt+I: Rust chộp element dưới con trỏ rồi báo về đây
  useEffect(() => {
    if (!isTauri()) return;
    const picked = listen<Located>("element-picked", async (event) => {
      const { runtimeId, path } = event.payload;
      const key = JSON.stringify(runtimeId);
      setSelectedWindow(key);
      const next = await inspect(key);
      const target = next && nodeAtPath(next, path);
      if (target) {
        await select(target, key);
        onToast(`Đã chộp ${target.controlType} ${target.name || ""}`.trim());
      } else {
        onToast("Chộp được element nhưng không khớp vào cây, thử soi lại");
      }
    });
    const failed = listen<string>("element-pick-failed", (event) => onToast(event.payload));
    return () => {
      void picked.then((un) => un());
      void failed.then((un) => un());
    };
  }, [inspect, select, onToast]);

  // Nhật ký focus: Rust giữ handler UIA, mỗi lần focus đổi thì bắn về đây
  useEffect(() => {
    if (!isTauri() || !logOn) return;
    void startFocusLog().catch((e) => onToast(String(e)));
    const changed = listen<FocusEvent>("focus-changed", (event) =>
      setLog((prev) => [event.payload, ...prev].slice(0, 50)),
    );
    const failed = listen<string>("focus-log-failed", (event) => {
      onToast(event.payload);
      setLogOn(false);
    });
    return () => {
      void stopFocusLog().catch(() => {});
      void changed.then((un) => un());
      void failed.then((un) => un());
    };
  }, [logOn, onToast]);

  const pickWindow = (w: WindowInfo) => {
    setSelectedWindow(keyOf(w));
    void inspect(keyOf(w));
  };

  const act = async (action: string) => {
    if (!node) return;
    setBusy(true);
    try {
      onToast(await runAction(JSON.parse(selectedWindow), node.path, action, text));
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
      const png = await captureElement(JSON.parse(selectedWindow), node.path);
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

  const exportTree = () => {
    if (!tree) return;
    const blob = new Blob([JSON.stringify(tree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(currentWindow?.classname || "uia-tree").replace(/[^\w.-]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast("Đã xuất cây ra tệp JSON");
  };

  const toggleBox = () => {
    const next = !boxOn;
    setBoxOn(next);
    if (next && node) void showHighlight(node.rect).catch(() => {});
    else void hideHighlight().catch(() => {});
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

  const snippet = detail
    ? SNIPPETS[Number(lang)].build({
        window: currentWindow,
        detail,
        text,
        isWindow: node?.path.length === 0,
      })
    : "";

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
          {shownWindows.length === 0 && <p className="dx-uia__empty">Không có cửa sổ nào khớp.</p>}
          {shownWindows.map((w) => (
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
          <button className="dx-btn" disabled={!tree} onClick={exportTree}>
            <ArrowDownloadRegular className="dx-icon" />
            Xuất JSON
          </button>
          <label className="dx-wi__check">
            <input type="checkbox" checked={boxOn} onChange={toggleBox} />
            Khung đỏ lên element
          </label>
          <label className="dx-wi__check">
            <input type="checkbox" checked={logOn} onChange={() => setLogOn((v) => !v)} />
            Ghi nhật ký focus
          </label>
          <span className="dx-wi__toolbar-hint">
            Rê chuột lên control bất kỳ rồi bấm <kbd className="dx-kbd">Ctrl+Alt+I</kbd> để chộp
          </span>
          {tree && <span className="dx-wi__toolbar-hint">{countNodes(tree).toLocaleString("vi-VN")} node</span>}
        </div>

        {!elevated && (
          <div className="dx-infobar dx-infobar--caution" role="status">
            <span className="dx-sev dx-sev--caution">
              <ImportantFilled className="dx-icon" />
            </span>
            <div className="dx-infobar__text">
              <span className="dx-infobar__title">Đang chạy quyền thường</span>
              Cửa sổ của app chạy với quyền admin sẽ không hiện trong danh sách.
            </div>
            <button className="dx-btn" onClick={() => void relaunchAsAdmin().catch((e) => onToast(String(e)))}>
              Mở lại với quyền admin
            </button>
          </div>
        )}

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
          <p className="dx-uia__empty">
            {busy ? "Đang đọc…" : "Chọn một cửa sổ ở danh sách bên trái, hoặc bấm Ctrl+Alt+I."}
          </p>
        )}

        {tree && (
          <div className="dx-wi__work">
            <section className="dx-panel" aria-label="Cây UI Automation">
              <div className="dx-panel__bar">
                <span className="dx-panel__title">Cây UI Automation</span>
                <div className="dx-wi__treefind">
                  <SearchRegular className="dx-icon" />
                  <input
                    className="dx-input"
                    type="search"
                    aria-label="Tìm trong cây"
                    placeholder="Tìm Name, AutomationId, ControlType"
                    value={treeQuery}
                    onChange={(e) => setTreeQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="dx-uia">
                {shownTree ? (
                  <TreeNode
                    node={shownTree}
                    level={0}
                    selected={node ? pathKey(node.path) : ""}
                    forceOpen={tq.length > 0}
                    onSelect={select}
                    onCopy={copy}
                  />
                ) : (
                  <p className="dx-uia__empty">Không có node nào khớp “{treeQuery.trim()}”.</p>
                )}
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
                    <strong>Invoke</strong>, <strong>Toggle</strong>, <strong>Đặt giá trị</strong> và{" "}
                    <strong>Chụp ảnh</strong> không cướp focus, app đích không hề bị chen ngang. <strong>Focus</strong>{" "}
                    và <strong>Gửi phím</strong> thì có — <code>SendInput</code> chỉ đi tới element đang giữ focus nên
                    không có đường vòng. Gửi phím nhận <code>{"{enter}"}</code>, <code>{"{tab}"}</code>,{" "}
                    <code>{"{esc}"}</code>.
                  </p>

                  {shot && (
                    <figure className="dx-uia__shot">
                      <img src={shot} alt="Ảnh chụp element đang chọn" />
                    </figure>
                  )}

                  <div className="dx-uia__snippet">
                    <div className="dx-uia__snippet-bar">
                      <Combo
                        label="Ngôn ngữ"
                        options={SNIPPETS.map((s, i) => [String(i), s.label] as [string, string])}
                        value={lang}
                        onChange={setLang}
                      />
                      <button className="dx-btn" onClick={() => copy(snippet, "Đã sao chép đoạn mã")}>
                        <CopyRegular className="dx-icon" />
                        Sao chép
                      </button>
                    </div>
                    <pre className="dx-uia__code">{snippet}</pre>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {logOn && (
          <section className="dx-panel" aria-label="Nhật ký focus">
            <div className="dx-panel__bar">
              <span className="dx-panel__title">Nhật ký focus · {log.length}</span>
              <button className="dx-btn" disabled={log.length === 0} onClick={() => setLog([])}>
                Xoá
              </button>
            </div>
            <div className="dx-uia dx-wi__log">
              {log.length === 0 ? (
                <p className="dx-uia__empty">Chuyển focus trong app nào đó để thấy sự kiện.</p>
              ) : (
                log.map((entry, i) => (
                  <div className="dx-uia__row" key={i}>
                    <span className="dx-uia__type">{entry.controlType}</span>
                    <span className="dx-uia__name" title={`${entry.classname} · pid ${entry.processId}`}>
                      {entry.name || "(không tên)"}
                    </span>
                    {entry.automationId && (
                      <button
                        className="dx-uia__id"
                        title="Sao chép AutomationId"
                        onClick={() => copy(entry.automationId)}
                      >
                        {entry.automationId}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

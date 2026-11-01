import { useEffect, useReducer, useState } from "react";
import { CheckmarkFilled } from "@fluentui/react-icons";
import { applyTheme, loadMode, onSystemChange, resolve, type Mode } from "./lib/theme";
import { TitleBar } from "./components/TitleBar";
import { WindowInspector } from "./pages/WindowInspector";
import { Settings } from "./pages/Settings";

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const onSettings = useHash() === "#/settings";
  const [mode, setMode] = useState<Mode>(loadMode);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => applyTheme(mode), [mode]);
  useEffect(
    () =>
      onSystemChange(() => {
        if (mode !== "system") return;
        applyTheme("system");
        rerender();
      }),
    [mode],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const toggleTheme = () => setMode((m) => (resolve(m) === "dark" ? "light" : "dark"));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        history.back();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleTheme();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dx-shell">
      <TitleBar dark={resolve(mode) === "dark"} onToggleTheme={toggleTheme} onSettings={onSettings} />
      <div className="dx-shell__main">
        <main className={`dx-content${onSettings ? "" : " dx-content--fill"}`}>
          <div key={onSettings ? "settings" : "inspector"} className="dx-page">
            {onSettings ? (
              <Settings mode={mode} onMode={setMode} />
            ) : (
              <>
                <h1 className="dx-title">Window Inspector</h1>
                <p className="dx-lead">Soi cây UI Automation của cửa sổ Windows đang mở</p>
                <WindowInspector onToast={setToast} />
              </>
            )}
          </div>
        </main>
      </div>
      {toast && (
        <div className="dx-toast-wrap">
          <div className="dx-toast" role="status">
            <span className="dx-sev dx-sev--success">
              <CheckmarkFilled className="dx-icon" />
            </span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

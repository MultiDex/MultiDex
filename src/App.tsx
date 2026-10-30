import { useEffect, useReducer, useRef, useState } from "react";
import { CheckmarkFilled } from "@fluentui/react-icons";
import { searchTools, toolById } from "./data/tools";
import { applyTheme, loadMode, onSystemChange, resolve, type Mode } from "./lib/theme";
import { TitleBar } from "./components/TitleBar";
import { Sidebar, type NavDisplay } from "./components/Sidebar";
import { Home } from "./pages/Home";
import { ToolPage } from "./pages/ToolPage";
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

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const NAV: Record<"wide" | "compact" | "minimal", [NavDisplay, NavDisplay]> = {
  wide: ["open", "compact"],
  compact: ["compact", "open"],
  minimal: ["hidden", "overlay"],
};

export default function App() {
  const hash = useHash();
  const tool = toolById(hash.match(/^#\/tool\/(.+)$/)?.[1] ?? "");
  const page = tool ? tool.id : hash === "#/settings" ? "settings" : "home";

  const [mode, setMode] = useState<Mode>(loadMode);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [pins, setPins] = useState(["json-formatter"]);
  const compactWidth = useMedia("(max-width: 1007px)");
  const minimalWidth = useMedia("(max-width: 640px)");
  const breakpoint = minimalWidth ? "minimal" : compactWidth ? "compact" : "wide";
  const [navToggled, setNavToggled] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
  useEffect(() => setNavToggled(false), [breakpoint]);
  useEffect(() => {
    if (breakpoint !== "wide") setNavToggled(false);
  }, [hash]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  const toggleTheme = () => setMode((m) => (resolve(m) === "dark" ? "light" : "dark"));
  const toggleNav = () => setNavToggled((t) => !t);
  const togglePin = (id: string) => setPins((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        history.back();
        return;
      }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "k") searchRef.current?.focus();
      else if (k === "b") toggleNav();
      else if (k === "l" && e.shiftKey) toggleTheme();
      else return;
      e.preventDefault();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const onQuery = (q: string) => {
    setQuery(q);
    if (page !== "home") location.hash = "#/";
  };
  const openFirstHit = () => {
    const hit = searchTools(query)[0];
    if (!query.trim() || !hit) return;
    setQuery("");
    location.hash = `#/tool/${hit.id}`;
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setToast("Đã sao chép vào clipboard");
  };

  return (
    <div className="dx-shell">
      <TitleBar
        query={query}
        onQuery={onQuery}
        onSubmit={openFirstHit}
        searchRef={searchRef}
        dark={resolve(mode) === "dark"}
        onToggleTheme={toggleTheme}
        onToggleNav={toggleNav}
      />
      <div className="dx-shell__main">
        <Sidebar
          current={page}
          pins={pins}
          display={NAV[breakpoint][navToggled ? 1 : 0]}
          onExpand={() => setNavToggled(breakpoint !== "wide")}
        />
        <main className="dx-content">
          <div key={page} className="dx-page">
            {tool ? (
              <ToolPage
                key={tool.id}
                tool={tool}
                pinned={pins.includes(tool.id)}
                onPin={() => togglePin(tool.id)}
                onCopy={copy}
              />
            ) : page === "settings" ? (
              <Settings mode={mode} onMode={setMode} />
            ) : (
              <Home query={query} pins={pins} onPin={togglePin} />
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

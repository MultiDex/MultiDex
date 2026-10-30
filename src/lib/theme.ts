export type Mode = "system" | "light" | "dark";

const KEY = "multidex.theme";
const mq = window.matchMedia("(prefers-color-scheme: dark)");

export function loadMode(): Mode {
  try {
    const m = localStorage.getItem(KEY);
    if (m === "light" || m === "dark") return m;
  } catch {}
  return "system";
}

export const resolve = (mode: Mode) => (mode === "system" ? (mq.matches ? "dark" : "light") : mode);

export function applyTheme(mode: Mode) {
  const root = document.documentElement;
  const theme = resolve(mode);
  root.classList.add("dx-no-transition");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("dx-no-transition")));
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
}

export function onSystemChange(fn: () => void) {
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

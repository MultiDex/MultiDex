import {
  ArrowLeftRegular,
  DismissRegular,
  SettingsRegular,
  SquareRegular,
  SubtractRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Props = { dark: boolean; onToggleTheme: () => void; onSettings: boolean };

const win = (action: "minimize" | "toggleMaximize" | "close") => () => {
  if (isTauri()) void getCurrentWindow()[action]();
};

export function TitleBar({ dark, onToggleTheme, onSettings }: Props) {
  return (
    <header className="dx-titlebar" data-tauri-drag-region>
      {onSettings && (
        <button
          className="dx-btn dx-btn--subtle"
          aria-label="Quay lại"
          title="Quay lại (Alt+←)"
          onClick={() => history.back()}
        >
          <ArrowLeftRegular className="dx-icon" />
        </button>
      )}
      <span className="dx-titlebar__app">
        <img className="dx-logo__icon" src="/favicon.svg" alt="" width="18" height="18" />
        <span className="dx-logo" aria-label="<Win>Dex">
          <span className="dx-logo__tag">&lt;Win&gt;</span>Dex
        </span>
      </span>
      <div className="dx-titlebar__drag" data-tauri-drag-region />
      <button
        className="dx-btn dx-btn--subtle dx-theme-toggle"
        aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        title="Đổi giao diện (Ctrl+Shift+L)"
        onClick={onToggleTheme}
      >
        <WeatherSunnyRegular className="dx-icon dx-ico-sun" />
        <WeatherMoonRegular className="dx-icon dx-ico-moon" />
      </button>
      {!onSettings && (
        <button
          className="dx-btn dx-btn--subtle"
          aria-label="Cài đặt"
          title="Cài đặt"
          onClick={() => (location.hash = "#/settings")}
        >
          <SettingsRegular className="dx-icon" />
        </button>
      )}
      <div className="dx-wc">
        <button aria-label="Thu nhỏ" title="Thu nhỏ" onClick={win("minimize")}>
          <SubtractRegular className="dx-icon" />
        </button>
        <button aria-label="Phóng to" title="Phóng to" onClick={win("toggleMaximize")}>
          <SquareRegular className="dx-icon" />
        </button>
        <button className="dx-wc__close" aria-label="Đóng" title="Đóng" onClick={win("close")}>
          <DismissRegular className="dx-icon" />
        </button>
      </div>
    </header>
  );
}

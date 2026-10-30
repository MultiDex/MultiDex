import type { RefObject } from "react";
import {
  ArrowLeftRegular,
  DismissRegular,
  NavigationRegular,
  SearchRegular,
  SquareRegular,
  SubtractRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

type Props = {
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
  dark: boolean;
  onToggleTheme: () => void;
  onToggleNav: () => void;
};

const win = (action: "minimize" | "toggleMaximize" | "close") => () => {
  if (isTauri()) void getCurrentWindow()[action]();
};

export function TitleBar({ query, onQuery, onSubmit, searchRef, dark, onToggleTheme, onToggleNav }: Props) {
  return (
    <header className="dx-titlebar" data-tauri-drag-region>
      <button
        className="dx-btn dx-btn--subtle"
        aria-label="Quay lại"
        title="Quay lại (Alt+←)"
        onClick={() => history.back()}
      >
        <ArrowLeftRegular className="dx-icon" />
      </button>
      <button
        className="dx-btn dx-btn--subtle"
        aria-label="Mở/đóng điều hướng"
        title="Mở/đóng điều hướng (Ctrl+B)"
        onClick={onToggleNav}
      >
        <NavigationRegular className="dx-icon" />
      </button>
      <span className="dx-titlebar__app">
        <span className="dx-logo" aria-label="<Multi>Dex">
          <span className="dx-logo__tag">&lt;Multi&gt;</span>Dex
        </span>
      </span>
      <div className="dx-titlebar__drag" data-tauri-drag-region>
        <div className="dx-search">
          <input
            ref={searchRef}
            className="dx-input"
            type="search"
            aria-label="Tìm công cụ"
            placeholder="Tìm công cụ"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") {
                onQuery("");
                e.currentTarget.blur();
              }
            }}
          />
          <span className="dx-search__end">
            <kbd className="dx-kbd">Ctrl+K</kbd>
            <SearchRegular className="dx-icon" />
          </span>
        </div>
      </div>
      <button
        className="dx-btn dx-btn--subtle dx-theme-toggle"
        aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        title="Đổi giao diện (Ctrl+Shift+L)"
        onClick={onToggleTheme}
      >
        <WeatherSunnyRegular className="dx-icon dx-ico-sun" />
        <WeatherMoonRegular className="dx-icon dx-ico-moon" />
      </button>
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

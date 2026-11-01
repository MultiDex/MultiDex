import type { MouseEvent } from "react";
import { ChevronDownRegular, ColorRegular, InfoRegular } from "@fluentui/react-icons";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Mode } from "../lib/theme";
import { Combo, SettingRow } from "../components/SettingRow";

const MODES: [Mode, string][] = [
  ["light", "Sáng"],
  ["dark", "Tối"],
  ["system", "Dùng cài đặt hệ thống"],
];

const SOURCE_URL = "https://github.com/MultiDex/MultiDex";

const openExternal = (e: MouseEvent<HTMLAnchorElement>) => {
  if (!isTauri()) return;
  e.preventDefault();
  void openUrl(e.currentTarget.href);
};

export function Settings({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <>
      <h1 className="dx-title">Cài đặt</h1>
      <div className="dx-settings dx-stack">
        <div className="dx-settings__header">Giao diện</div>
        <SettingRow icon={ColorRegular} title="Giao diện ứng dụng" desc="Chọn giao diện sẽ hiển thị">
          <Combo label="Giao diện ứng dụng" options={MODES} value={mode} onChange={onMode} />
        </SettingRow>

        <div className="dx-settings__header">Giới thiệu</div>
        <details className="dx-expander">
          <summary className="dx-setting">
            <InfoRegular className="dx-icon dx-icon--20" />
            <div className="dx-setting__text">
              <div>&lt;Win&gt;Dex</div>
              <div className="dx-setting__desc">Soi cây UI Automation của cửa sổ Windows</div>
            </div>
            <span className="dx-setting__desc">0.1.0</span>
            <ChevronDownRegular className="dx-icon dx-expander__chev" />
          </summary>
          <div className="dx-expander__row">
            <span>Phiên bản</span>
            <span>0.1.0</span>
          </div>
          <div className="dx-expander__row">
            <span>Mã nguồn</span>
            <a className="dx-link" href={SOURCE_URL} target="_blank" rel="noreferrer" onClick={openExternal}>
              github.com/MultiDex/MultiDex
            </a>
          </div>
          <div className="dx-expander__row">
            <span>Giấy phép bên thứ ba</span>
            <span className="dx-setting__desc">
              Cascadia Mono (OFL) · Fluent System Icons (MIT) · uiautomation-rs (Apache-2.0)
            </span>
          </div>
        </details>
      </div>
    </>
  );
}

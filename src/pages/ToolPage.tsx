import { useState } from "react";
import {
  ArrowClockwiseRegular,
  DismissRegular,
  ImportantFilled,
  PinRegular,
  WindowNewRegular,
} from "@fluentui/react-icons";
import type { Tool } from "../data/tools";
import { CodePanel } from "../components/CodePanel";
import { OptionRow, Seg } from "../components/SettingRow";

type Props = { tool: Tool; pinned: boolean; onPin: () => void; onCopy: (text: string) => void };

export function ToolPage({ tool, pinned, onPin, onCopy }: Props) {
  const [mode, setMode] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  return (
    <div className="dx-toolpage">
      <div className="dx-pagehead">
        <div>
          <h1 className="dx-title">{tool.name}</h1>
          <p className="dx-lead">{tool.desc}</p>
        </div>
        <div className="dx-pagehead__actions">
          {tool.action && (
            <button className="dx-btn dx-btn--accent">
              <ArrowClockwiseRegular className="dx-icon" />
              {tool.action}
            </button>
          )}
          <button
            className="dx-btn dx-btn--subtle dx-btn--icon"
            aria-label="Mở trong cửa sổ mới"
            title="Mở trong cửa sổ mới"
          >
            <WindowNewRegular className="dx-icon" />
          </button>
          <button
            className={`dx-btn dx-btn--subtle dx-btn--icon${pinned ? " dx-pinned" : ""}`}
            aria-label={pinned ? "Bỏ ghim" : "Ghim"}
            aria-pressed={pinned}
            title={pinned ? "Bỏ ghim (Ctrl+D)" : "Ghim (Ctrl+D)"}
            onClick={onPin}
          >
            <PinRegular className="dx-icon" />
          </button>
        </div>
      </div>

      {tool.modes && (
        <div className="dx-stack">
          <Seg label="Chế độ" items={tool.modes} value={mode} onChange={setMode} />
        </div>
      )}

      {tool.options.length > 0 && (
        <div className="dx-settings dx-stack">
          <div className="dx-settings__header">Cấu hình</div>
          {tool.options.map((o) => (
            <OptionRow key={o.title} option={o} />
          ))}
        </div>
      )}

      {tool.info && showInfo && (
        <div className="dx-infobar dx-infobar--caution dx-stack" role="status">
          <span className="dx-sev dx-sev--caution">
            <ImportantFilled className="dx-icon" />
          </span>
          <div className="dx-infobar__text">
            <span className="dx-infobar__title">{tool.info.title}</span>
            {tool.info.text}
          </div>
          <button
            className="dx-btn dx-btn--subtle dx-btn--sm dx-btn--icon"
            aria-label="Đóng"
            title="Đóng"
            onClick={() => setShowInfo(false)}
          >
            <DismissRegular className="dx-icon" />
          </button>
        </div>
      )}

      <div className={`dx-split${tool.input ? "" : " dx-split--single"}`}>
        {tool.input && <CodePanel title="Input" panel={tool.input} />}
        <CodePanel title="Output" panel={tool.output} onCopy={() => onCopy(tool.output.text)} />
      </div>
    </div>
  );
}

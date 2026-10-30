import {
  CheckmarkFilled,
  ClipboardPasteRegular,
  CopyRegular,
  DismissRegular,
  DocumentRegular,
} from "@fluentui/react-icons";
import type { Panel } from "../data/tools";
import { tokenize } from "../lib/highlight";

type Props = { title: "Input" | "Output"; panel: Panel; onCopy?: () => void };

export function CodePanel({ title, panel, onCopy }: Props) {
  const lines = panel.text.split("\n").length;
  const bytes = new TextEncoder().encode(panel.text).length;
  return (
    <section className="dx-panel" aria-label={title}>
      <div className="dx-panel__bar">
        <span className="dx-panel__title">{title}</span>
        {onCopy ? (
          <button className="dx-btn dx-btn--sm" onClick={onCopy} title="Sao chép Output (Ctrl+Shift+C)">
            <CopyRegular className="dx-icon" />
            Sao chép
          </button>
        ) : (
          <>
            <button
              className="dx-btn dx-btn--subtle dx-btn--sm dx-btn--icon"
              aria-label="Dán"
              title="Dán (Ctrl+Shift+V)"
            >
              <ClipboardPasteRegular className="dx-icon" />
            </button>
            <button className="dx-btn dx-btn--subtle dx-btn--sm dx-btn--icon" aria-label="Mở tệp" title="Mở tệp">
              <DocumentRegular className="dx-icon" />
            </button>
            <button
              className="dx-btn dx-btn--subtle dx-btn--sm dx-btn--icon"
              aria-label="Xoá"
              title="Xoá (Ctrl+Shift+X)"
            >
              <DismissRegular className="dx-icon" />
            </button>
          </>
        )}
      </div>
      <div className="dx-panel__body">
        <div className="dx-panel__gutter" aria-hidden>
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="dx-panel__code">
          {panel.json
            ? tokenize(panel.text).map(([cls, text], i) =>
                cls ? (
                  <span key={i} className={cls}>
                    {text}
                  </span>
                ) : (
                  text
                ),
              )
            : panel.text}
        </pre>
      </div>
      <div className="dx-panel__status">
        {panel.ok ? (
          <span className="dx-state">
            <span className="dx-sev dx-sev--success">
              <CheckmarkFilled className="dx-icon" />
            </span>
            {panel.ok}
          </span>
        ) : (
          <span>Ln 1, Col 1</span>
        )}
        <span>
          {lines} dòng · {bytes} B
        </span>
      </div>
    </section>
  );
}

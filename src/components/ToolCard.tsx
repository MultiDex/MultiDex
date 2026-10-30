import { PinRegular } from "@fluentui/react-icons";
import type { Tool } from "../data/tools";

type Props = { tool: Tool; pinned: boolean; onPin: () => void };

export function ToolCard({ tool, pinned, onPin }: Props) {
  const Icon = tool.icon;
  return (
    <a className="dx-toolcard" href={`#/tool/${tool.id}`}>
      <span className="dx-toolcard__icon">
        <Icon className="dx-icon dx-icon--24" />
      </span>
      <div>
        <div className="dx-toolcard__title">
          {tool.name}
          {tool.isNew && <span className="dx-badge dx-badge--accent">Mới</span>}
        </div>
        <div className="dx-toolcard__desc">{tool.desc}</div>
      </div>
      <button
        className="dx-toolcard__pin dx-btn dx-btn--subtle dx-btn--sm dx-btn--icon"
        aria-label={pinned ? "Bỏ ghim" : "Ghim"}
        aria-pressed={pinned}
        title={pinned ? "Bỏ ghim (Ctrl+D)" : "Ghim (Ctrl+D)"}
        onClick={(e) => {
          e.preventDefault();
          onPin();
        }}
      >
        <PinRegular className="dx-icon" />
      </button>
    </a>
  );
}

import type { ReactNode } from "react";
import { ChevronDownRegular, type FluentIcon } from "@fluentui/react-icons";

type RowProps = { icon?: FluentIcon; title: string; desc?: string; children: ReactNode };

export function SettingRow({ icon: Icon, title, desc, children }: RowProps) {
  return (
    <div className="dx-setting">
      {Icon && <Icon className="dx-icon dx-icon--20" />}
      <div className="dx-setting__text">
        <div>{title}</div>
        {desc && <div className="dx-setting__desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

type SegProps = { label: string; items: string[]; value: number; onChange: (i: number) => void };

export function Seg({ label, items, value, onChange }: SegProps) {
  return (
    <div className="dx-seg" role="group" aria-label={label}>
      {items.map((item, i) => (
        <button key={item} aria-pressed={i === value} onClick={() => onChange(i)}>
          {item}
        </button>
      ))}
    </div>
  );
}

type ComboProps<T extends string> = { label: string; options: [T, string][]; value: T; onChange: (v: T) => void };

export function Combo<T extends string>({ label, options, value, onChange }: ComboProps<T>) {
  return (
    <span className="dx-combo">
      <select className="dx-input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      <ChevronDownRegular className="dx-icon" />
    </span>
  );
}

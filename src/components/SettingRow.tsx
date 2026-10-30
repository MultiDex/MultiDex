import { useState, type ReactNode } from "react";
import { ChevronDownRegular, type FluentIcon } from "@fluentui/react-icons";
import type { Option } from "../data/tools";

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

export function OptionRow({ option }: { option: Option }) {
  const [seg, setSeg] = useState(option.kind === "seg" ? option.value : 0);
  const [on, setOn] = useState(option.kind === "switch" && option.on);
  return (
    <SettingRow icon={option.icon} title={option.title} desc={option.desc}>
      {option.kind === "seg" && <Seg label={option.title} items={option.items} value={seg} onChange={setSeg} />}
      {option.kind === "switch" && (
        <label className="dx-switch dx-switch--end">
          <input
            type="checkbox"
            role="switch"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            aria-label={option.title}
          />
          <span className="dx-switch__state">{on ? "Bật" : "Tắt"}</span>
        </label>
      )}
      {option.kind === "input" && (
        <input
          className="dx-input dx-input--mono"
          defaultValue={option.value}
          placeholder={option.placeholder}
          aria-label={option.title}
          spellCheck={false}
        />
      )}
    </SettingRow>
  );
}

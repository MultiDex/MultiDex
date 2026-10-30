import { Fragment, useState } from "react";
import { ChevronDownRegular, HomeRegular, SettingsRegular, type FluentIcon } from "@fluentui/react-icons";
import { categories, toolById, tools } from "../data/tools";

export type NavDisplay = "open" | "compact" | "overlay" | "hidden";

type ItemProps = {
  href: string;
  label: string;
  icon?: FluentIcon;
  current: boolean;
  child?: boolean;
  dot?: boolean;
  compact: boolean;
};

function NavItem({ href, label, icon: Icon, current, child, dot, compact }: ItemProps) {
  return (
    <a
      className={`dx-nav-item${child ? " dx-nav-item--child" : ""}`}
      href={href}
      aria-current={current ? "page" : undefined}
      title={compact ? label : undefined}
    >
      {Icon && <Icon className="dx-icon" />}
      <span className="dx-nav-item__label">{label}</span>
      {dot && <span className="dx-infobadge" title="Phát hiện JWT trong clipboard" />}
    </a>
  );
}

type Props = { current: string; pins: string[]; display: NavDisplay; onExpand: () => void };

export function Sidebar({ current, pins, display, onExpand }: Props) {
  const [open, setOpen] = useState(["Encoders / Decoders"]);
  const compact = display === "compact";
  const toggle = (name: string) => setOpen((o) => (o.includes(name) ? o.filter((n) => n !== name) : [...o, name]));
  const expandTo = (name: string) => {
    onExpand();
    setOpen((o) => (o.includes(name) ? o : [...o, name]));
  };

  return (
    <nav className={`dx-nav${display === "open" ? "" : ` dx-nav--${display}`}`} aria-label="Công cụ">
      <NavItem href="#/" icon={HomeRegular} label="Trang chủ" current={current === "home"} compact={compact} />
      <div className="dx-nav__sep" />
      {pins.length > 0 && <div className="dx-nav__header">Đã ghim</div>}
      {pins.map((id) => {
        const t = toolById(id)!;
        return (
          <NavItem
            key={id}
            href={`#/tool/${id}`}
            icon={t.icon}
            label={t.name}
            current={current === id}
            compact={compact}
          />
        );
      })}
      <div className="dx-nav__header">Danh mục</div>
      {categories.map((c) => {
        const isOpen = open.includes(c.name);
        return (
          <Fragment key={c.name}>
            <button
              className="dx-nav-item"
              aria-expanded={isOpen}
              title={compact ? c.name : undefined}
              onClick={() => (compact ? expandTo(c.name) : toggle(c.name))}
            >
              <c.icon className="dx-icon" />
              <span className="dx-nav-item__label">{c.name}</span>
              <ChevronDownRegular className="dx-icon dx-nav-item__chev" />
            </button>
            {isOpen &&
              tools
                .filter((t) => t.category === c.name)
                .map((t) => (
                  <NavItem
                    key={t.id}
                    href={`#/tool/${t.id}`}
                    label={t.name}
                    current={current === t.id && !pins.includes(t.id)}
                    child
                    dot={t.dot}
                    compact={compact}
                  />
                ))}
          </Fragment>
        );
      })}
      <div className="dx-nav__spacer" />
      <div className="dx-nav__sep" />
      <NavItem
        href="#/settings"
        icon={SettingsRegular}
        label="Cài đặt"
        current={current === "settings"}
        compact={compact}
      />
    </nav>
  );
}

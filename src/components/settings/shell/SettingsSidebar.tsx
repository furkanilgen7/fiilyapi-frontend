"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { isActivePath } from "@/lib/shell/isActive";
import { useLogout } from "@/lib/shell/useLogout";
import { SETTINGS_NAV } from "./settings-nav-config";
import "./settings-shell.css";

export function SettingsSidebar() {
  const pathname = usePathname();
  const handleLogout = useLogout();

  return (
    <aside className="settings-sidebar" aria-label="Ayarlar menüsü">
      <Link href="/" className="settings-sidebar__back">
        ← Gösterge Paneli
      </Link>
      {SETTINGS_NAV.map((group, gi) => (
        <div key={group.heading}>
          <div className="settings-group">
            <div className="settings-group__label">{group.heading}</div>
            <nav className="settings-nav-list">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx("settings-nav-item", active && "settings-nav-item--active")}
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden="true">{item.emoji}</span> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          {gi < SETTINGS_NAV.length - 1 && <div className="settings-divider" />}
        </div>
      ))}
      <div className="settings-divider" />
      <button type="button" className="settings-logout" onClick={handleLogout}>
        🚪 Çıkış Yap
      </button>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/shell/initials";
import { isActivePath } from "@/lib/shell/isActive";
import { SettingsIcon } from "@/components/ui/icons";
import { NAV_GROUPS } from "./nav-config";
import { useSession } from "./SessionProvider";
import "./sidebar.css";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="sidebar-group">
            <div className="sidebar-group__heading">{group.heading}</div>
            {group.items.map(({ label, href, Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cx("sidebar-item", active && "sidebar-item--active")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon width={18} height={18} className="sidebar-item__icon" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <Link href="/ayarlar" className="sidebar-user__row">
          <span className="sidebar-user__avatar" aria-hidden="true">{me ? initials(me.full_name) : ""}</span>
          <span className="sidebar-user__meta">
            <span className="sidebar-user__name">{me?.full_name ?? ""}</span>
            <span className="sidebar-user__role">{me?.title ?? ""}</span>
          </span>
        </Link>
        <div className="sidebar-user__actions">
          <Link href="/ayarlar" className="sidebar-user__btn">
            <SettingsIcon width={14} height={14} /> Ayarlar
          </Link>
          <button type="button" className="sidebar-user__btn sidebar-user__btn--logout" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
      </div>
    </aside>
  );
}

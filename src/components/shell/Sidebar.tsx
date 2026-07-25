"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cx } from "@/lib/cx";
import { initials } from "@/lib/shell/initials";
import { isActivePath } from "@/lib/shell/isActive";
import { LockIcon } from "@/components/ui/icons";
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
                  <Icon width={16} height={16} className="sidebar-item__icon" />
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
          <LockIcon className="sidebar-user__lock" />
        </Link>
        <div className="sidebar-user__actions">
          <Link href="/ayarlar" className="sidebar-user__btn">
            <span aria-hidden="true">⚙️</span> Ayarlar
          </Link>
          <button type="button" className="sidebar-user__btn sidebar-user__btn--logout" onClick={handleLogout}>
            <span aria-hidden="true">🚪</span> Çıkış
          </button>
        </div>
      </div>
    </aside>
  );
}

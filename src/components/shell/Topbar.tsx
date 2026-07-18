"use client";

import { BellIcon } from "@/components/ui/icons";
import { initials } from "@/lib/shell/initials";
import { useSession } from "./SessionProvider";
import "./topbar.css";

export default function Topbar() {
  const { me } = useSession();
  const avatar = me ? initials(me.full_name) : "";

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-logo__mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="var(--color-on-brand)" opacity=".3" />
          </svg>
        </span>
        <span className="topbar-logo__name">FİİL</span>
        <span className="topbar-logo__sub">YAPI</span>
      </div>

      <div className="topbar-actions">
        <button type="button" className="topbar-bell" aria-label="Bildirimler">
          <BellIcon width={18} height={18} />
        </button>
        <span className="topbar-avatar" aria-hidden="true">{avatar}</span>
      </div>
    </header>
  );
}

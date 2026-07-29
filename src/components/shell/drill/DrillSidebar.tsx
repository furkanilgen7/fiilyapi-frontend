import Link from "next/link";
import { cx } from "@/lib/cx";
import { isActivePath } from "@/lib/shell/isActive";
import "./drill-sidebar.css";

export interface DrillNavItem {
  label: string;
  href: string;
  emoji: string;
  /**
   * Yalnız tam eşleşmede aktif sayılır. Bir öğenin href'i daha derindeki bir
   * öğenin href'inin ÖN EKİ olduğunda (ör. "/projeler" ile "/projeler/1")
   * varsayılan ön ek eşleşmesi ikisini birden aktif işaretler; ata (ancestor)
   * öğeler bu bayrakla işaretlenir (kod inceleme bulgusu).
   */
  exact?: boolean;
}

export interface DrillNavGroup {
  heading: string;
  items: DrillNavItem[];
}

export interface DrillSidebarProps {
  /** Bir üst seviyenin adı (sabit metin değil, o seviyenin gerçek adı) */
  backLabel: string;
  backHref: string;
  /** <nav aria-label>; çağıran bağlama göre verir (ör. "Proje gezinme") */
  ariaLabel: string;
  groups: DrillNavGroup[];
  /** Aktif yol dışarıdan verilir; bileşen routing hook'u çağırmaz */
  activePath: string;
}

/**
 * Genel drill-in sidebar primitive'i (P2 Karar 1). Yapısı `SettingsSidebar`
 * ile birebir aynıdır: üstte geri linki, gruplu liste, isActivePath ile
 * aktif işaretleme. Menü içeriği (project-nav-config vb.) dışarıdan gelir —
 * bu bileşen içerikten habersizdir.
 */
export function DrillSidebar({ backLabel, backHref, ariaLabel, groups, activePath }: DrillSidebarProps) {
  return (
    <nav className="drill-sidebar" aria-label={ariaLabel}>
      <Link href={backHref} className="drill-sidebar__back">
        ← {backLabel}
      </Link>
      {groups.map((group, gi) => (
        <div key={group.heading}>
          <div className="drill-group">
            <div className="drill-group__label">{group.heading}</div>
            <div className="drill-nav-list">
              {group.items.map((item) => {
                const active = item.exact
                  ? activePath === item.href
                  : isActivePath(activePath, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx("drill-nav-item", active && "drill-nav-item--active")}
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden="true">{item.emoji}</span> {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {gi < groups.length - 1 && <div className="drill-divider" />}
        </div>
      ))}
    </nav>
  );
}

import Link from "next/link";
import { cx } from "@/lib/cx";

export interface SiteDetailTabsProps {
  projectId: string;
  siteId: string;
  /** Aktif yol dışarıdan verilir; bileşen routing hook'u çağırmaz (DrillSidebar deseni). */
  activePath: string;
}

interface TabDef {
  label: string;
  slug: string | null;
  /** Rotasi yazildi mi — yazilmamis sekmeler "Bu bölüm yakında" ipucu tasir. */
  written?: boolean;
}

// Sekmeler (spec §5.3, §7.3): Bölümler ve İş Kalemleri yazildi; digerleri
// gorunur kalir ve henuz yazilmamis rotalara gider (catch-all -> ComingSoon).
//
// "İş Kalemleri" Ekran 13 spec §2.2 ile eklendi — Şantiye Detay mockup'inda bu
// sekme YOKTUR, onayli sapma B'dir (§13). Drill sidebar ile ayrismamasi icin
// project-nav-config.ts'teki sira ile birebir ayni: Bölümler'den hemen sonra.
//
// "Hakedişler" P7 T6 ile yazildi (`Şantiye - Hakedişler.dc.html`) —
// project-nav-config.ts'teki sira ile ayrismamali.
const TABS: TabDef[] = [
  { label: "Bölümler", slug: null, written: true },
  { label: "İş Kalemleri", slug: "is-kalemleri", written: true },
  { label: "Puantaj", slug: "puantaj" },
  { label: "Stok", slug: "stok" },
  { label: "Hakedişler", slug: "hakedisler", written: true },
  { label: "Günlük Kayıt", slug: "gunluk-kayit" },
  { label: "Belgeler", slug: "belgeler" },
];

export function SiteDetailTabs({ projectId, siteId, activePath }: SiteDetailTabsProps) {
  const base = `/projeler/${projectId}/santiyeler/${siteId}`;

  return (
    <div className="site-detail-tabs" role="tablist" aria-label="Şantiye detay sekmeleri">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = activePath === href;
        return (
          <Link
            key={tab.label}
            href={href}
            role="tab"
            aria-selected={active}
            title={tab.written ? undefined : "Bu bölüm yakında"}
            className={cx("site-detail-tabs__tab", active && "site-detail-tabs__tab--active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

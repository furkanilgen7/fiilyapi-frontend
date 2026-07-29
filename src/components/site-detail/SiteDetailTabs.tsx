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
}

// Sekmeler (spec §5.3, §7.3): yalniz Bölümler yazildi; digerleri gorunur
// kalir ve henuz yazilmamis rotalara gider (catch-all -> ComingSoon).
const TABS: TabDef[] = [
  { label: "Bölümler", slug: null },
  { label: "Puantaj", slug: "puantaj" },
  { label: "Stok", slug: "stok" },
  { label: "Hakedişler", slug: "hakedisler" },
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
            title={tab.slug ? "Bu bölüm yakında" : undefined}
            className={cx("site-detail-tabs__tab", active && "site-detail-tabs__tab--active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

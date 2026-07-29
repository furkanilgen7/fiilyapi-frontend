import Link from "next/link";
import { cx } from "@/lib/cx";

export interface ProjectDetailTabsProps {
  projectId: string;
  /** Aktif yol dışarıdan verilir; bileşen routing hook'u çağırmaz (DrillSidebar deseni). */
  activePath: string;
}

interface TabDef {
  label: string;
  slug: string | null;
}

// Sekmeler (spec §4.1, §7.3): yalniz Şantiyeler yazildi; digerleri gorunur
// kalir ve henuz yazilmamis rotalara gider (catch-all -> ComingSoon).
const TABS: TabDef[] = [
  { label: "Şantiyeler", slug: null },
  { label: "İş Kalemleri", slug: "is-kalemleri" },
  { label: "İşveren Hakediş", slug: "isveren-hakedis" },
  { label: "Taşeron Hakediş", slug: "taseron-hakedis" },
  { label: "Belgeler", slug: "belgeler" },
];

export function ProjectDetailTabs({ projectId, activePath }: ProjectDetailTabsProps) {
  const base = `/projeler/${projectId}`;

  return (
    <div className="project-hero__tabs" role="tablist" aria-label="Proje detay sekmeleri">
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
            className={cx("project-hero__tab", active && "project-hero__tab--active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

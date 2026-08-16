import Link from "next/link";
import { cx } from "@/lib/cx";

export interface ProjectDetailTabsProps {
  projectId: string;
  /** Aktif yol dışarıdan verilir; bileşen routing hook'u çağırmaz (DrillSidebar deseni). */
  activePath: string;
}

interface TabDef {
  label: string;
  /**
   * Bu sekmenin hedef ekranı YAZILDI mı — yazılmamış olan devre-dışı basılır
   * (silinmez). Sonraki dilim "burayı güncellemem gerekiyor"u bu bayraktan görür.
   */
  written?: boolean;
  /**
   * Sekmenin GERÇEK hedef yolu. Hedef ekran proje kimliğini query param olarak
   * okur; param adları hedef ekranın BUGÜN okuduğu adlardır (uydurma yok).
   * `written` olmayan sekmede yoktur.
   */
  hrefFor?: (projectId: string) => string;
  /**
   * Devre-dışı sekmenin kullanıcıya GÖRÜNEN gerekçesi. Yalnız yazılmamış
   * sekmede bulunur — gerekçe notu bu alandan TÜRETİLİR, ayrıca yazılmaz.
   */
  disabledReason?: string;
}

/**
 * "İş Kalemleri" sekmesinin devre-dışı olma gerekçesi — kullanıcıya GÖRÜNÜR
 * basılır (yalnız `title` yetmez). Testler bu sabiti import eder.
 *
 * Çıplak glif yasağı: tipografik sembol yok, düz sözcük + normal tire.
 */
export const WORK_ITEMS_TAB_DISABLED_HINT =
  "İş kalemleri şantiye bazında tutulur - aşağıdaki şantiye kartlarından açın.";

// Sekmeler (spec §4.1, §7.3) — adlar ve SIRA mockup'tan gelir
// (`Proje Detay - Şantiyeler.dc.html:88`), değiştirilmez.
//
// "Şantiyeler" bu ekranın kendisidir (kök rota).
//
// "İş Kalemleri" proje seviyesinde YOKTUR: BOQ şantiye kapsamlıdır, ne mockup'ta
// ne backend'de "tüm şantiyelerin iş kalemleri" kavramı var. Kalıcı kural
// (F-TH kanonu): rotası olmayan mockup öğesi SİLİNMEZ, devre-dışı + görünür
// gerekçeyle basılır — bkz. WORK_ITEMS_TAB_DISABLED_HINT.
//
// "İşveren Hakediş" P7 dilimiyle geldi (`/hakedisler`); proje kimliği
// `project_id` query paramı ile taşınır.
//
// "Taşeron Hakediş" TH + F-TH dilimleriyle geldi (`/hakedisler/taseron`);
// `subcontractor-filters.ts` `project_id` paramını okur.
//
// "Belgeler" BC + F-BC dilimleriyle geldi (`/belgeler`); `ArchiveDocumentsView`
// proje süzgecini `proje` paramından okur (PROJECT_PARAM).
const TABS: TabDef[] = [
  {
    label: "Şantiyeler",
    written: true,
    hrefFor: (id) => `/projeler/${encodeURIComponent(id)}`,
  },
  { label: "İş Kalemleri", disabledReason: WORK_ITEMS_TAB_DISABLED_HINT },
  {
    label: "İşveren Hakediş",
    written: true,
    hrefFor: (id) => `/hakedisler?project_id=${encodeURIComponent(id)}`,
  },
  {
    label: "Taşeron Hakediş",
    written: true,
    hrefFor: (id) => `/hakedisler/taseron?project_id=${encodeURIComponent(id)}`,
  },
  {
    label: "Belgeler",
    written: true,
    hrefFor: (id) => `/belgeler?proje=${encodeURIComponent(id)}`,
  },
];

export function ProjectDetailTabs({ projectId, activePath }: ProjectDetailTabsProps) {
  // Gerekçe notu devre-dışı sekmeden TÜRETİLİR, sabit basılmaz: sekme ileride
  // yazılırsa (hrefFor + written eklenirse) not da KENDİLİĞİNDEN kalkar.
  // Sabit basılsaydı, canlı bir sekmenin altında onu yalanlayan bir not
  // kalırdı ve bekçi bunu göremezdi — bu dilimin düzelttiği çürüme sınıfı.
  const disabledTab = TABS.find((tab) => !tab.written || !tab.hrefFor);

  return (
    <>
      <div className="project-hero__tabs" role="tablist" aria-label="Proje detay sekmeleri">
        {TABS.map((tab) => {
          // Yazılmamış sekme TIKLANABİLİR DEĞİLDİR: <Link> değil <span>
          // (PersonnelTabsStrip deseni) — ölü bağlantı basılmaz.
          if (!tab.written || !tab.hrefFor) {
            return (
              <span
                key={tab.label}
                role="tab"
                aria-selected={false}
                aria-disabled
                tabIndex={-1}
                title={tab.disabledReason}
                className="project-hero__tab project-hero__tab--disabled"
              >
                {tab.label}
              </span>
            );
          }

          const href = tab.hrefFor(projectId);
          const active = activePath === href;
          return (
            <Link
              key={tab.label}
              href={href}
              role="tab"
              aria-selected={active}
              className={cx("project-hero__tab", active && "project-hero__tab--active")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {/* Devre-dışı sekmenin gerekçesi ekranda GÖRÜNÜR (TreasuryView deseni). */}
      {disabledTab?.disabledReason ? (
        <p className="project-hero__tab-note" data-testid="project-tabs-work-items-reason">
          {disabledTab.disabledReason}
        </p>
      ) : null}
    </>
  );
}

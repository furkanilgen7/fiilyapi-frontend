import Link from "next/link";
import { cx } from "@/lib/cx";
import type { ProjectType } from "@/lib/api/hooks/useProjects";

export interface ProjectDetailTabsProps {
  projectId: string;
  /** Aktif yol dışarıdan verilir; bileşen routing hook'u çağırmaz (DrillSidebar deseni). */
  activePath: string;
  /**
   * 🔴 F-PKK K1 — İKİ SEKME PROJE TÜRÜNE GÖRE KOŞULLUDUR.
   *
   * Ayrımı yapan alan ÖLÇÜLDÜ: `ProjectDetailResponse.project_type`
   * (`ProjectType = "taahhut" | "kendi_yatirim" | "kat_karsiligi"`).
   * `contracting`/`investment`/`land_share` kartlarının hangisinin dolu
   * geldiği YALNIZ BİR İPUCUDUR ve ayrım için KULLANILMAZ: üçü de
   * `… | null`dır, yani boş bir `land_share` kartı taşıyan kat karşılığı
   * projesi sekmeleri sessizce kaybederdi.
   */
  projectType: ProjectType;
}

interface TabDef {
  label: string;
  /**
   * Bu sekmenin GÖRÜNDÜĞÜ proje türleri. Tanımsızsa sekme HER türde görünür
   * (bugünkü beş sekmenin hepsi böyledir) — yani alan eklemek mevcut
   * davranışı değiştirmez.
   */
  types?: readonly ProjectType[];
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
/**
 * F-PKK · İki yeni ekranın rota kurucuları. Sekme şeridi DIŞINDA da okunurlar
 * (sayfaların kendi `activePath` karşılaştırması) — dize iki yerde
 * yazılsaydı aktif sekme sessizce hiç işaretlenmezdi.
 */
export const projectSummaryHref = (projectId: string) =>
  `/projeler/${encodeURIComponent(projectId)}/ozet`;
export const projectAllocationHref = (projectId: string) =>
  `/projeler/${encodeURIComponent(projectId)}/paylasim`;

const TABS: TabDef[] = [
  {
    label: "Şantiyeler",
    written: true,
    hrefFor: (id) => `/projeler/${encodeURIComponent(id)}`,
  },
  // 🔴 F-PKK K1 · "Proje Özeti" — İKİ mockup, TEK rota. Ekran proje türüne
  // göre KY (`Proje - Kendi Yatırım`) ya da KK (`Proje - Kat Karşılığı`)
  // düzenini basar. Taahhütte YOKTUR: o türün özeti bu ekranın kendisidir
  // (`Proje Detay - Şantiyeler`) ve maliyet ucunun kâr bloğu taahhütte
  // ünite/satış taşımaz (`_profit`: `realized_sales`/`remaining_stock_value`
  // taahhütte `None`).
  {
    label: "Proje Özeti",
    types: ["kendi_yatirim", "kat_karsiligi"],
    written: true,
    hrefFor: projectSummaryHref,
  },
  // 🔴 F-PKK K1 · "Paylaşım Tablosu" (`Kat Karşılığı - Paylaşım`) YALNIZ kat
  // karşılığında. Öteki türlerde `GET /projects/{id}/land-share/summary`
  // 404 döner (şema notu: boş özet DEĞİL) — sekme basılsaydı kullanıcı her
  // seferinde açıklanamayan bir boş ekrana giderdi.
  {
    label: "Paylaşım Tablosu",
    types: ["kat_karsiligi"],
    written: true,
    hrefFor: projectAllocationHref,
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

export function ProjectDetailTabs({
  projectId,
  activePath,
  projectType,
}: ProjectDetailTabsProps) {
  // Tür süzgeci ÖNCE uygulanır: gerekçe notu da yalnız GÖRÜNEN sekmelerden
  // türemeli, yoksa hiç basılmayan bir sekmenin notu ekranda kalırdı.
  const visibleTabs = TABS.filter((tab) => !tab.types || tab.types.includes(projectType));

  // Gerekçe notu devre-dışı sekmeden TÜRETİLİR, sabit basılmaz: sekme ileride
  // yazılırsa (hrefFor + written eklenirse) not da KENDİLİĞİNDEN kalkar.
  // Sabit basılsaydı, canlı bir sekmenin altında onu yalanlayan bir not
  // kalırdı ve bekçi bunu göremezdi — bu dilimin düzelttiği çürüme sınıfı.
  const disabledTab = visibleTabs.find((tab) => !tab.written || !tab.hrefFor);

  return (
    <>
      <div className="project-hero__tabs" role="tablist" aria-label="Proje detay sekmeleri">
        {visibleTabs.map((tab) => {
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

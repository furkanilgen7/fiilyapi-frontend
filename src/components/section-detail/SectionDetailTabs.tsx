"use client";

/**
 * Bölüm detayı sekme şeridi (D99-105).
 *
 * 🔴 KABUL EDİLMİŞ SAPMA: bölüm seviyesinde ROTA YOKTUR (task-2-brief §Rota:
 * drill sidebar'a bölüm eklenmez). Bu yüzden `SiteDetailTabs`/`ProjectDetailTabs`
 * gibi `Link` tabanlı değil, `<button>` + YEREL state ile geçiş yapar.
 * Şerit bu dosyaya AYRILDI (F-BOLLINK) ki bekçi testi onu hook mock'u olmadan
 * render edebilsin — F-PRJTAB kanonu: *koruma, yüzeyin araca KAYDEDİLMESİDİR.*
 *
 * 🔑 İKİ AYRI GERÇEK KARIŞTIRILMAZ (F-BOLLINK ölçümü, 2026-08-17):
 *   - "modül YAZILMADI" → hiçbir rotası yok, kullanıcı hiçbir yerde göremez.
 *   - "modül YAZILDI ama BÖLÜM kapsamlı içerik bağlanmadı" → şantiye
 *     seviyesinde ekran VAR, yalnız bu bölüme kırılmıyor.
 * BEŞ sekmenin BEŞİ de ikinci durumdadır: `is-kalemleri`, `puantaj`, `stok`,
 * `hakedisler`, `gunluk-kayit` rotalarının hepsi yazılı (ölçüldü). Eski
 * `pendingModule: "boq" | "timesheet" | …` alanı kullanıcıya "modül yok"
 * diyordu — YANLIŞ bilgiydi; yerine `contentPending` (bölüm bağı yok) geçti.
 *
 * `siteSlug` + `moduleWritten` bekçinin çapasıdır: `tab-strip-routes.test.tsx`
 * iddiayı dosya sistemindeki gerçek rota ağacıyla karşılaştırır ve İKİ YÖNDE de
 * kırmızıya döner — `moduleWritten: false` denip rota YAZILIRSA da (kusurun
 * kendisi buydu), `true` denip rota silinir/yeniden adlandırılırsa da.
 */

export interface SectionTabDef {
  readonly label: string;
  /**
   * Bu sekmenin içeriğini taşıyan/taşıyacak ŞANTİYE seviyesi rota dilimi
   * (`/projeler/{p}/santiyeler/{s}/<slug>`). HER ZAMAN doludur — `moduleWritten`
   * ile birlikte bekçinin İKİ YÖNLÜ çapasını kurar.
   */
  readonly siteSlug: string;
  /**
   * İDDİA: o rota bugün YAZILI mı? Bekçi bunu dosya sistemindeki gerçek rota
   * ağacıyla karşılaştırır — `false` iddia edilip rota yazılırsa da, `true`
   * iddia edilip rota silinirse de test KIRMIZI olur.
   */
  readonly moduleWritten: boolean;
}

/**
 * BOQ-SEC-F — sekmenin İÇERİK hâli, AYRIK BİRLİK olarak.
 *
 * `tab-strip-routes` bekçisi bugüne kadar iki hâl tanıyordu: (a) bir rotaya
 * çözülen `href`li sekme, (b) `contentPending` gerekçesiyle devre dışı sekme.
 * Bölüm şeridi YEREL state ile geçiş yapar (rota yok) ve İş Kalemleri sekmesi
 * artık GERÇEK içerik basıyor — ikisi de değil. İşaretlenmezse bekçi canlı bir
 * sekmeyi "gerekçesiz" sayıp kırmızı olurdu.
 *
 * Ayrık birlik BİLİNÇLİ: `contentPending: string | null` yazılsaydı, gerekçe
 * basan dal `null`ı da kabul etmek zorunda kalır ve derleyici "canlı sekmenin
 * gerekçesi yok" gerçeğini KORUYAMAZDI — ekran sessizce boş bir gerekçe basardı.
 */
export type SectionTabContent =
  /** İçerik bu ekranda GERÇEKTEN basılır. */
  | { readonly contentLive: true; readonly contentPending?: undefined }
  /** İçerik basılmaz; gerekçe `pending-modules` anahtarından gelir. */
  | { readonly contentLive?: undefined; readonly contentPending: string };

// 🔴 `moduleWritten` ÖLÇÜLDÜ (2026-08-17), varsayılmadı: beş rotanın BEŞİ de
// `src/app/(app)/projeler/[projectId]/santiyeler/[siteId]/` altında yazılıdır.
export const SECTION_TABS: readonly (SectionTabDef & SectionTabContent)[] = [
  // BOQ-SEC-F: bölüm bağı AÇILDI — `GET /sites/{id}/boq?section_id=` canlı.
  {
    label: "İş Kalemleri",
    siteSlug: "is-kalemleri",
    moduleWritten: true,
    contentLive: true,
  },
  // F-BLMPUAN: bölüm bağı AÇILDI — `TimesheetEntry.section_id` var ve matris
  // bölüm süzgeciyle görünüme uygulanıyor (K2: süzgeç istemcide).
  {
    label: "İşçiler & Puantaj",
    siteSlug: "puantaj",
    moduleWritten: true,
    contentLive: true,
  },
  { label: "Malzeme", siteSlug: "stok", moduleWritten: true, contentPending: "section_stock" },
  { label: "Hakediş", siteSlug: "hakedisler", moduleWritten: true, contentPending: "section_progress_payments" },
  { label: "Günlük Kayıt", siteSlug: "gunluk-kayit", moduleWritten: true, contentPending: "section_site_diary" },
];

export interface SectionDetailTabsProps {
  projectId: string;
  siteId: string;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function SectionDetailTabs({
  projectId,
  siteId,
  activeIndex,
  onSelect,
}: SectionDetailTabsProps) {
  const base = `/projeler/${projectId}/santiyeler/${siteId}`;

  return (
    <div className="section-tabs" role="tablist" aria-label="Bölüm detay sekmeleri">
      {SECTION_TABS.map((tab, index) => (
        <button
          key={tab.label}
          type="button"
          role="tab"
          aria-selected={activeIndex === index}
          // Bekçi çapaları (DOM'dan okunur — sabiti import etmek bileşenin
          // kendi mantığını atlardı, F-PRJTAB kanonu).
          data-content-pending={tab.contentPending ?? undefined}
          data-content-live={tab.contentLive ? "true" : undefined}
          data-module-route={`${base}/${tab.siteSlug}`}
          data-module-written={String(tab.moduleWritten)}
          className={
            activeIndex === index ? "section-tabs__tab section-tabs__tab--active" : "section-tabs__tab"
          }
          onClick={() => onSelect(index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

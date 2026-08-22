import Link from "next/link";

import { EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON } from "./equipment-labels";
import "./equipment.css";

interface TabDef {
  label: string;
  /** Gerçek rotası olan sekmenin href'i; yoksa `undefined` (devre-dışı basılır). */
  href?: string;
  /** `href` yoksa gösterilecek devre-dışı gerekçesi. */
  disabledReason?: string;
}

/** Şeridi basan ekranların kullandığı sekme adları — serbest string değil. */
export type EquipmentTabLabel =
  | "Ekipman Listesi"
  | "Çalışma Kaydı"
  | "Yakıt Takibi"
  | "Kira Hakedişi"
  | "Bakım Takvimi";

// F-MK T2 · spec K1 — M3'ün sidebar'ı (Ekipman Listesi/Çalışma Kaydı/Bakım
// Takvimi/Yakıt Takibi) ile M4'ün sekme çubuğu (Ekipman Listesi/Çalışma
// Kaydı/Kira Hakedişi/Yakıt Takibi) FARKLI dört öğe listeliyor; kanonik küme
// İKİSİNİN BİRLEŞİMİDİR (beş sekme). Kalıcı kural (F-TH emsali): rotası
// olmayan mockup öğesi SİLİNMEZ, devre-dışı + görünür gerekçeyle basılır.
//
// "Çalışma Kaydı" ve "Yakıt Takibi" rotaları F-MK'da yazıldı. "Kira Hakedişi"
// F-KIRA'da CANLIYA ALINDI: MK-2 backend'i (`/equipment/rental-invoices*`,
// 7 yol) canlıda ve `/makine/kira` liste ekranı bu dilimde yazıldı — sekme
// artık gerçek bir rotaya iner. "Bakım Takvimi" (mockup'ı hiç yok) tek
// devre-dışı sekmedir ve kalıcı gerekçeyle basılır.
const TABS: TabDef[] = [
  { label: "Ekipman Listesi", href: "/makine" },
  { label: "Çalışma Kaydı", href: "/makine/calisma" },
  { label: "Yakıt Takibi", href: "/makine/yakit" },
  { label: "Kira Hakedişi", href: "/makine/kira" },
  { label: "Bakım Takvimi", disabledReason: EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON },
];

export interface EquipmentTabsStripProps {
  /** Bu ekranda AKTİF olan sekme; varsayılan `/makine` liste ekranıdır. */
  activeTab?: EquipmentTabLabel;
}

/** Paylaşılan sekme şeridi — T3/T4 (Çalışma Kaydı/Yakıt Takibi) AYNISINI kullanır. */
export function EquipmentTabsStrip({ activeTab = "Ekipman Listesi" }: EquipmentTabsStripProps) {
  // Görünür gerekçe listesi ŞERİDİN KENDİSİNDEN türer (aşağıdaki nota bak).
  const disabledReasons = TABS.filter((tab) => !tab.href)
    .map((tab) => tab.disabledReason)
    .filter((reason): reason is string => Boolean(reason));

  return (
    <div className="makine-tabs-block">
      <div className="makine-tabs" role="tablist" aria-label="Makine & Ekipman sekmeleri">
      {TABS.map((tab) => {
        const isActive = tab.label === activeTab;

        // Aktif sekme kendi sayfasına bağlanmaz (gezinme değil, konum bildirir).
        if (tab.href && !isActive) {
          return (
            <Link key={tab.label} href={tab.href} role="tab" className="makine-tabs__tab">
              {tab.label}
            </Link>
          );
        }

        const reason = tab.href ? undefined : tab.disabledReason;

        return (
          <span
            key={tab.label}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isActive}
            tabIndex={-1}
            title={isActive ? undefined : reason}
            className={
              "makine-tabs__tab" +
              (isActive ? " makine-tabs__tab--active" : " makine-tabs__tab--disabled")
            }
          >
            {tab.label}
          </span>
        );
      })}
      </div>

      {/*
        🔴 spec K1 — devre-dışı sekmeler GÖRÜNÜR Türkçe gerekçe taşır. `title`
        yalnız imleç üstündeyken çıkar; kullanıcı sekmenin neden tıklanamadığını
        fareyi bekletmeden görebilmelidir (F-TH kalıcı kuralı: rotası olmayan
        mockup öğesi silinmez, devre-dışı + GÖRÜNÜR gerekçeyle basılır).

        🔴 GEREKÇE, AÇIKLADIĞI ÖĞEDEN TÜRETİLİR (F-PRJTAB final review kanonu).
        Metin önceden iki sabiti ELLE yan yana basıyordu; "Kira Hakedişi"
        canlıya alındığında o cümle ekranda kalır ve ARTIK ÇALIŞAN bir sekmeyi
        yalanlardı — rota bekçileri `href` denetler, METNİ denetlemez. Artık
        liste `TABS`ten türer: bir sekme `href` kazandığı anda gerekçesi
        kendiliğinden düşer, hiçbir yerde ikinci bir güncelleme gerekmez.
        Devre-dışı sekme kalmazsa paragraf hiç basılmaz.
      */}
      {disabledReasons.length > 0 && (
        <p className="makine-tabs__reason" data-testid="makine-tabs-reasons">
          {disabledReasons.join(" ")}
        </p>
      )}
    </div>
  );
}

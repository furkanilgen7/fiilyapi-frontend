import Link from "next/link";

import {
  EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON,
  EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON,
} from "./equipment-labels";
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
// "Çalışma Kaydı" ve "Yakıt Takibi" rotaları bu dilimde (T3/T4) henüz
// yazılmadı ama spec §1'de rotaları AÇIKÇA ayrılmış ve backend'i (MK-1)
// canlıdır — `href` ŞİMDİDEN verilir (K4'ün "Düzenle" bağlantısıyla aynı
// karar): hedef sayfa yazılana kadar kabuğun catch-all'ı ComingSoon basar,
// bu KIRIK bir bağlantı değildir. "Kira Hakedişi" (backend'i MK-2'de hâlâ
// yazılıyor) ve "Bakım Takvimi" (mockup'ı hiç yok) bu ayrıcalığı taşımaz —
// ikisi de kalıcı gerekçeyle devre-dışı basılır.
const TABS: TabDef[] = [
  { label: "Ekipman Listesi", href: "/makine" },
  { label: "Çalışma Kaydı", href: "/makine/calisma" },
  { label: "Yakıt Takibi", href: "/makine/yakit" },
  { label: "Kira Hakedişi", disabledReason: EQUIPMENT_TAB_LEASE_SETTLEMENT_REASON },
  { label: "Bakım Takvimi", disabledReason: EQUIPMENT_TAB_MAINTENANCE_CALENDAR_REASON },
];

export interface EquipmentTabsStripProps {
  /** Bu ekranda AKTİF olan sekme; varsayılan `/makine` liste ekranıdır. */
  activeTab?: EquipmentTabLabel;
}

/** Paylaşılan sekme şeridi — T3/T4 (Çalışma Kaydı/Yakıt Takibi) AYNISINI kullanır. */
export function EquipmentTabsStrip({ activeTab = "Ekipman Listesi" }: EquipmentTabsStripProps) {
  return (
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
  );
}

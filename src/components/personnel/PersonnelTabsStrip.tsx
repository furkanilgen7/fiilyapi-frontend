import Link from "next/link";

import { HR_DOCUMENTS_ROUTE, LEAVES_ROUTE, TAB_PENDING_REASON } from "./personnel-list-labels";
import "./personnel-list.css";

interface TabDef {
  label: string;
  /** Gerçek rotası olan sekmenin href'i; yoksa `undefined` (devre-dışı basılır). */
  href?: string;
}

/** Şeridi basan ekranların kullandığı sekme adları — serbest string değil. */
export type PersonnelTabLabel = "Personel Listesi" | "Belge & Sertifika" | "İzin Yönetimi";

// P 70-77 · İK sekme şeridi. Kalıcı kural: rotası olmayan mockup öğesi
// SİLİNMEZ, devre-dışı + görünür gerekçeyle basılır. "Puantaj" (spec K3),
// F-İK T2'den beri "Belge & Sertifika" ve F-IZN T5'ten beri "İzin Yönetimi"
// GERÇEK rotaya gider; Bordro / SGK ekranları henüz yazılmadı.
//
// F-İK T5: şerit artık BİRDEN ÇOK ekran tarafından paylaşılır (`/personel`,
// `/personel/belgeler`, `/personel/izinler`) — aktif sekme SABİT DEĞİL,
// parametreyle gelir. İkinci bir şerit YAZILMAZ (görev emri kuralı): aktif
// olan sekme düz metne düşer, diğerleri gerçek rotalarına bağlanır.
const TABS: TabDef[] = [
  { label: "Personel Listesi", href: "/personel" },
  { label: "İzin Yönetimi", href: LEAVES_ROUTE },
  { label: "Belge & Sertifika", href: HR_DOCUMENTS_ROUTE },
  { label: "Puantaj", href: "/puantaj" },
  { label: "Bordro" },
  { label: "SGK" },
];

export interface PersonnelTabsStripProps {
  /** Bu ekranda AKTİF olan sekme; varsayılan `/personel` liste ekranıdır. */
  activeTab?: PersonnelTabLabel;
}

export function PersonnelTabsStrip({ activeTab = "Personel Listesi" }: PersonnelTabsStripProps) {
  return (
    <div className="personel-tabs" role="tablist" aria-label="İnsan Kaynakları sekmeleri">
      {TABS.map((tab) => {
        const isActive = tab.label === activeTab;

        // Aktif sekme kendi sayfasına bağlanmaz (gezinme değil, konum bildirir).
        if (tab.href && !isActive) {
          return (
            <Link key={tab.label} href={tab.href} role="tab" className="personel-tabs__tab">
              {tab.label}
            </Link>
          );
        }

        return (
          <span
            key={tab.label}
            role="tab"
            aria-selected={isActive}
            aria-disabled={!isActive}
            tabIndex={-1}
            title={isActive ? undefined : TAB_PENDING_REASON}
            className={
              "personel-tabs__tab" +
              (isActive ? " personel-tabs__tab--active" : " personel-tabs__tab--disabled")
            }
          >
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}

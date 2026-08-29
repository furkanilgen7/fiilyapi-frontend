import Link from "next/link";

import { PAYROLL_ROUTE, PAYROLL_SGK_ROUTE } from "@/components/payroll/payroll-labels";

import { HR_DOCUMENTS_ROUTE, LEAVES_ROUTE } from "./personnel-list-labels";
import "./personnel-list.css";
import { routes } from "@/lib/routes";

interface TabDef {
  label: string;
  href: string;
}

/** Şeridi basan ekranların kullandığı sekme adları — serbest string değil. */
export type PersonnelTabLabel = "Personel Listesi" | "Belge & Sertifika" | "İzin Yönetimi";

// P 70-77 · İK sekme şeridi.
//
// F-İK T5: şerit BİRDEN ÇOK ekran tarafından paylaşılır (`/personel`,
// `/personel/belgeler`, `/personel/izinler`) — aktif sekme SABİT DEĞİL,
// parametreyle gelir. İkinci bir şerit YAZILMAZ (görev emri kuralı): aktif
// olan sekme düz metne düşer, diğerleri gerçek rotalarına bağlanır.
//
// 🔴 F-BOR T5 (K8) · ŞERİDİN SON İKİ ÖLÜ SEKMESİ CANLANDI. "Bordro" ve "SGK"
// bugüne kadar href'siz + `aria-disabled` + "henüz yazılmadı" gerekçesiyle
// basılıyordu ("rotası olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır" —
// F-TH kanonu). Bu dilimde her iki ekran da yazıldı (`/bordro`,
// `/bordro/sgk`), yani gerekçe ORTADAN KALKTI ve sekmeler GERÇEK rotaya
// bağlanır — F-İK ("Belge & Sertifika") ve F-IZN ("İzin Yönetimi") ile birebir
// aynı yol.
//
// 🔴 Sonuç: şeritte artık rotasız sekme KALMADI ⇒ `href` zorunlu alan oldu ve
// devre-dışı dalı (`--disabled` sınıfı + `TAB_PENDING_REASON` title'ı) ÖLÜ KOD
// olarak kaldırıldı. Kanon iptal edilmedi, YALNIZCA bu şeritte uygulanacak
// örnek kalmadı; ileride rotasız bir sekme doğarsa desen `PayrollSgkView`
// (K11) ve `PersonnelDetailView`teki "Bordroyu Gör" düğmesinde canlıdır.
//
// 🔴 "Bordroyu Gör" (`PersonnelDetailView`) DEVRE-DIŞI KALIR: kişi bazlı
// bordro rotası mockup'ta YOKTUR, bu dilim onu açmaz.
const TABS: readonly TabDef[] = [
  { label: "Personel Listesi", href: routes.personnel.list() },
  { label: "İzin Yönetimi", href: LEAVES_ROUTE },
  { label: "Belge & Sertifika", href: HR_DOCUMENTS_ROUTE },
  { label: "Puantaj", href: routes.timesheet() },
  { label: "Bordro", href: PAYROLL_ROUTE },
  { label: "SGK", href: PAYROLL_SGK_ROUTE },
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
        if (!isActive) {
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
            aria-selected
            tabIndex={-1}
            className="personel-tabs__tab personel-tabs__tab--active"
          >
            {tab.label}
          </span>
        );
      })}
    </div>
  );
}

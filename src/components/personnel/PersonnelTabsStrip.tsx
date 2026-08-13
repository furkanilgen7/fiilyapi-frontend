import Link from "next/link";

import { HR_DOCUMENTS_ROUTE, TAB_PENDING_REASON } from "./personnel-list-labels";
import "./personnel-list.css";

interface TabDef {
  label: string;
  /** Gerçek rotası olan sekmenin href'i; yoksa `undefined` (devre-dışı basılır). */
  href?: string;
  active?: boolean;
}

// P 70-77 · İK sekme şeridi. Kalıcı kural: rotası olmayan mockup öğesi
// SİLİNMEZ, devre-dışı + görünür gerekçeyle basılır. "Puantaj" (spec K3) ve
// F-İK T2'den beri "Belge & Sertifika" GERÇEK rotaya gider; İzin Yönetimi /
// Bordro / SGK ekranları henüz yazılmadı.
const TABS: TabDef[] = [
  { label: "Personel Listesi", active: true },
  { label: "İzin Yönetimi" },
  { label: "Belge & Sertifika", href: HR_DOCUMENTS_ROUTE },
  { label: "Puantaj", href: "/puantaj" },
  { label: "Bordro" },
  { label: "SGK" },
];

export function PersonnelTabsStrip() {
  return (
    <div className="personel-tabs" role="tablist" aria-label="İnsan Kaynakları sekmeleri">
      {TABS.map((tab) =>
        tab.href ? (
          <Link key={tab.label} href={tab.href} role="tab" className="personel-tabs__tab">
            {tab.label}
          </Link>
        ) : (
          <span
            key={tab.label}
            role="tab"
            aria-selected={tab.active ?? false}
            aria-disabled={!tab.active}
            tabIndex={-1}
            title={tab.active ? undefined : TAB_PENDING_REASON}
            className={
              "personel-tabs__tab" +
              (tab.active
                ? " personel-tabs__tab--active"
                : " personel-tabs__tab--disabled")
            }
          >
            {tab.label}
          </span>
        ),
      )}
    </div>
  );
}

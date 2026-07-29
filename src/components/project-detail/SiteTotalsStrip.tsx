import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SiteListResponse } from "@/lib/api/hooks/useSites";

import "./project-detail.css";

export interface SiteTotalsStripProps {
  totals: SiteListResponse["totals"];
}

interface KpiCardDef {
  label: string;
  pendingModule: string;
}

// Alt KPI seridi (spec §4.4). Backend spec §4.1'e gore SiteListTotals'in
// TAMAMI bu dilimde yer tutucu — dordu de ayni desenle basilir, hicbiri
// sessizce atlanmaz (spec §7.1).
const CARDS: KpiCardDef[] = [
  { label: "Toplam Hakediş", pendingModule: "progress_payments" },
  { label: "Toplam Taşeron", pendingModule: "subcontracts" },
  { label: "Aktif İşçi", pendingModule: "timesheet" },
  { label: "Ortalama Marj", pendingModule: "project_costs" },
];

export function SiteTotalsStrip({ totals }: SiteTotalsStripProps) {
  // `totals` suanda tamamen yer tutucu oldugundan degerleri okumuyoruz; ileride
  // backend gercek veri saglarsa her hucre kendi alanini (totals.*) okuyacak
  // sekilde genisletilir. Prop yine de arayuz sozlesmesi icin tutulur.
  void totals;

  return (
    <div className="site-totals" data-testid="site-totals-strip">
      {CARDS.map((card) => (
        <div key={card.pendingModule} className="site-totals__card">
          <div className="site-totals__label">{card.label}</div>
          <div
            className="site-totals__value site-totals__value--pending"
            title={pendingModuleLabel(card.pendingModule)}
          >
            —
          </div>
        </div>
      ))}
    </div>
  );
}

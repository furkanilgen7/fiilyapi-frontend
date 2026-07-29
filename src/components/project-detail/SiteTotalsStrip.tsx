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
// sessizce atlanmaz (spec §7.1). "Hangi modul bekleniyor" bilgisi KODA
// GOMULU DEGIL, gelen yukten okunur (kod inceleme bulgusu — daldaki diger tum
// yer tutucular gibi): backend modulu degistirirse title da degisir.
function cardsFrom(totals: SiteTotalsStripProps["totals"]): KpiCardDef[] {
  return [
    { label: "Toplam Hakediş", pendingModule: totals.total_progress_payment.pending_module },
    { label: "Toplam Taşeron", pendingModule: totals.subcontractor_count.pending_module },
    { label: "Aktif İşçi", pendingModule: totals.active_worker_count.pending_module },
    { label: "Ortalama Marj", pendingModule: totals.average_margin.pending_module },
  ];
}

export function SiteTotalsStrip({ totals }: SiteTotalsStripProps) {
  return (
    <div className="site-totals" data-testid="site-totals-strip">
      {cardsFrom(totals).map((card) => (
        <div key={card.label} className="site-totals__card">
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

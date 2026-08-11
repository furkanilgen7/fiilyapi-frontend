import { cx } from "@/lib/cx";
import { pendingModuleLabel, type PendingModuleKey } from "@/lib/pending-modules";
import type { BoqTotals } from "@/lib/api/hooks/useBoq";

import "./boq.css";

export interface BoqTotalsStripProps {
  /** Yük gelmeden (yükleniyor/hata) de şerit basılır — spec §9 sonu. */
  totals?: BoqTotals;
}

interface KpiCardDef {
  label: string;
  /** Yük yokken bilinmez; o zaman ipucu metni UYDURULMAZ. */
  pendingModule?: PendingModuleKey;
  /** Veri geldiği gün mockup rengine dönmek için (79, 83, 87). */
  valueClass?: string;
}

// Dort ozet karti (mockup 72–89). Backend spec §3.2'ye gore DORDU DE bu dilimde
// yer tutucudur: `contract_total`/`revision_total` sozlesme modulunu (P5),
// `realized_total`/`remaining_total` hakedis modulunu (P7) bekler. `grand_total`
// bu seritte DEGIL, GENEL TOPLAM satirinda basilir (mockup'ta oyle bir kart yok).
//
// "Hangi modul bekleniyor" bilgisi KODA GOMULU DEGIL, gelen yukten okunur
// (SiteTotalsStrip kanonu): backend modulu degistirirse ipucu da degisir.
function cardsFrom(totals?: BoqTotals): KpiCardDef[] {
  return [
    { label: "Toplam Sözleşme", pendingModule: totals?.contract_total.pending_module },
    {
      label: "Gerçekleşen",
      pendingModule: totals?.realized_total.pending_module,
      valueClass: "boq-kpi__value--realized",
    },
    {
      label: "Kalan İş",
      pendingModule: totals?.remaining_total.pending_module,
      valueClass: "boq-kpi__value--remaining",
    },
    {
      label: "Revize / Ek İş",
      pendingModule: totals?.revision_total.pending_module,
      valueClass: "boq-kpi__value--revision",
    },
  ];
}

export function BoqTotalsStrip({ totals }: BoqTotalsStripProps) {
  return (
    <div className="boq-totals" data-testid="boq-totals-strip">
      {cardsFrom(totals).map((card) => {
        const hint = card.pendingModule ? pendingModuleLabel(card.pendingModule) : undefined;
        return (
          <div key={card.label} className="boq-kpi" data-testid="boq-kpi">
            <div className="boq-kpi__label" data-testid="boq-kpi-label">
              {card.label}
            </div>
            {/* Yer tutucu deger: mockup'in vurgulu rengiyle basmak sahte veri
                izlenimi yaratir (spec §4 durustluk kurali) — `--pending` soluk
                rengi ezer. `title` tek basina yeterli degil, sr-only metin de
                verilir (spec §10). */}
            <div
              className={cx("boq-kpi__value", card.valueClass, "boq-kpi__value--pending")}
              data-testid="boq-kpi-value"
              title={hint}
            >
              —{hint && <span className="sr-only">{hint}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

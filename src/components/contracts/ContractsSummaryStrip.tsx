import { formatCompactCurrency } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ContractSummary } from "@/lib/api/hooks/useContracts";

import "./contracts.css";

/**
 * SZL 34-38 · dört KPI kartı. Sıra/etiket/renk mockup'tan BİREBİR:
 * - 35 "TOPLAM BEDEL"    nötr metin  + mono  → `total_amount`
 * - 36 "AKTİF"           yeşil       (mono YOK, mockup'ta da yok) → `active_count`
 * - 37 "TOPLAM HAKEDİŞ"  mavi        + mono  → `progress_payment_total`
 * - 38 "BU AY DOLACAK"   kehribar    (mono YOK) → `expiring_this_month_count`
 *
 * Mockup'ta ikon YOKTUR (kartlar yalnız etiket + değer taşır) — bu yüzden
 * ikon EKLENMEZ.
 *
 * Zarif düşüş: `progress_payment_total` TAŞERON sekmesinde backend'de
 * `None`dır (şema açıklaması: taşeron hakedişi ayrı dilim, sahte `0`
 * dönmüyor). Kart SİLİNMEZ — "—" + görünür gerekçe (title + sr-only) basılır.
 */
export interface ContractsSummaryStripProps {
  summary?: ContractSummary;
}

const COUNT_SUFFIX = "Sözleşme"; // 36 "4 Sözleşme" · 38 "1 Sözleşme"

export function ContractsSummaryStrip({ summary }: ContractsSummaryStripProps) {
  if (!summary) return null;

  const paymentTotal = summary.progress_payment_total;

  return (
    <div className="szl-kpi" data-testid="szl-kpi-strip">
      <div className="szl-kpi__card">
        <div className="szl-kpi__label">Toplam Bedel</div>
        <div className="szl-kpi__value szl-kpi__value--neutral szl-kpi__value--mono">
          {formatCompactCurrency(summary.total_amount)}
        </div>
      </div>

      <div className="szl-kpi__card">
        <div className="szl-kpi__label">Aktif</div>
        <div className="szl-kpi__value szl-kpi__value--success">
          {summary.active_count} {COUNT_SUFFIX}
        </div>
      </div>

      <div className="szl-kpi__card">
        <div className="szl-kpi__label">Toplam Hakediş</div>
        {paymentTotal === null || paymentTotal === undefined ? (
          <div
            className="szl-kpi__value szl-kpi__value--pending"
            title={pendingModuleLabel("subcontractor_progress_payment_total")}
            data-testid="szl-kpi-payment-total"
          >
            —
            <span className="sr-only">
              {pendingModuleLabel("subcontractor_progress_payment_total")}
            </span>
          </div>
        ) : (
          <div
            className="szl-kpi__value szl-kpi__value--primary szl-kpi__value--mono"
            data-testid="szl-kpi-payment-total"
          >
            {formatCompactCurrency(paymentTotal)}
          </div>
        )}
      </div>

      <div className="szl-kpi__card">
        <div className="szl-kpi__label">Bu Ay Dolacak</div>
        <div className="szl-kpi__value szl-kpi__value--warning">
          {summary.expiring_this_month_count} {COUNT_SUFFIX}
        </div>
      </div>
    </div>
  );
}

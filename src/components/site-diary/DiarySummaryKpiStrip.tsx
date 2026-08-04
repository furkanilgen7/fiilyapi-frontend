import { formatCompactCurrency, formatCurrencyPrecise, formatPercent } from "@/lib/format";

import type { DiarySummaryKpis } from "./summary-kpis";

export interface DiarySummaryKpiStripProps {
  kpis: DiarySummaryKpis;
}

/**
 * HÖ99-121 · dört KPI kartı.
 *
 * Hiçbir tutar SESSİZCE SIFIRLANMAZ (F-TH korkuluğu): kaynak liste kırpıldıysa
 * ya da uç hata verdiyse tutar yerine "—" ve kartın ALTINDA görünür gerekçe
 * basılır. Alt metinlerdeki oranlar da paydası yoksa basılmaz.
 */
export function DiarySummaryKpiStrip({ kpis }: DiarySummaryKpiStripProps) {
  return (
    <div className="diary-kpis">
      {/* HÖ100-104 — gradyanlı işveren kartı */}
      <section className="diary-kpi diary-kpi--brand" aria-labelledby="diary-kpi-employer">
        <h2 className="diary-kpi__label" id="diary-kpi-employer">
          İşveren Hakediş
        </h2>
        <p className="diary-kpi__value">
          {kpis.employerTotal === null ? "—" : formatCurrencyPrecise(kpis.employerTotal)}
        </p>
        <p className="diary-kpi__meta">
          {kpis.employerContractSharePct === null
            ? (kpis.employerContractShareReason ?? "Oran hesaplanamadı.")
            : `Sözleşmenin ${formatPercent(kpis.employerContractSharePct)}'i`}
        </p>
        {kpis.employerPendingReason !== null && (
          <p className="diary-kpi__note">{kpis.employerPendingReason}</p>
        )}
      </section>

      {/* HÖ105-109 — taşeron kartı (sol kenar kırmızı) */}
      <section
        className="diary-kpi diary-kpi--accent-danger"
        aria-labelledby="diary-kpi-subcontractor"
      >
        <h2 className="diary-kpi__label" id="diary-kpi-subcontractor">
          Taşeron Ödemeleri
        </h2>
        <p className="diary-kpi__value diary-kpi__value--danger">
          {kpis.subcontractorTotal === null ? "—" : formatCurrencyPrecise(kpis.subcontractorTotal)}
        </p>
        <p className="diary-kpi__meta">
          {kpis.subcontractorCount === null
            ? "Taşeron dağılımı gösterilemiyor."
            : `${kpis.subcontractorCount} taşeron${
                kpis.subcontractorSharePct === null
                  ? ""
                  : ` · ${formatPercent(kpis.subcontractorSharePct)}`
              }`}
        </p>
        {kpis.subcontractorPendingReason !== null && (
          <p className="diary-kpi__note">{kpis.subcontractorPendingReason}</p>
        )}
      </section>

      {/* HÖ110-114 — brüt kâr kartı (sol kenar yeşil) */}
      <section
        className="diary-kpi diary-kpi--accent-success"
        aria-labelledby="diary-kpi-profit"
      >
        <h2 className="diary-kpi__label" id="diary-kpi-profit">
          Brüt Kar (Bu Ay)
        </h2>
        <p className="diary-kpi__value diary-kpi__value--success">
          {kpis.grossProfit === null ? "—" : formatCurrencyPrecise(kpis.grossProfit)}
        </p>
        <p className="diary-kpi__meta diary-kpi__meta--success">
          {kpis.grossMarginPct === null
            ? "Marj hesaplanamadı."
            : `${formatPercent(kpis.grossMarginPct)} marj`}
        </p>
      </section>

      {/* HÖ115-120 — kümülatif kart + ilerleme çubuğu */}
      <section className="diary-kpi" aria-labelledby="diary-kpi-cumulative">
        <h2 className="diary-kpi__label" id="diary-kpi-cumulative">
          Kümülatif Hakediş
        </h2>
        <p className="diary-kpi__value">
          {kpis.cumulativeGross === null ? "—" : formatCompactCurrency(kpis.cumulativeGross)}
        </p>
        <p className="diary-kpi__meta">
          {kpis.cumulativeProgressPct === null
            ? "Sözleşme oranı gösterilemiyor."
            : `Sözleşmenin ${formatPercent(kpis.cumulativeProgressPct)}'i`}
        </p>
        {/* HÖ119 */}
        <div className="diary-kpi__bar">
          <div
            className="diary-kpi__bar-fill"
            style={{ width: `${kpis.cumulativeWidthPct}%` }}
          />
        </div>
        {kpis.cumulativePendingReason !== null && (
          <p className="diary-kpi__note">{kpis.cumulativePendingReason}</p>
        )}
      </section>
    </div>
  );
}

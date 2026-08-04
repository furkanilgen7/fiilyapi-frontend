import Link from "next/link";

import { formatAmount, formatCurrencyPrecise, formatPercent } from "@/lib/format";

import type { DiarySummaryKpis } from "./summary-kpis";

export interface DiarySummaryProfitPanelProps {
  kpis: DiarySummaryKpis;
  /** HÖ226 "Taşeron Hakediş →" */
  subcontractorPaymentsHref: string;
  /** HÖ227 "İşveren Hakediş →" */
  employerPaymentsHref: string;
}

/**
 * HÖ175-230 · "Taşeron vs İşveren — Karlılık Analizi" paneli.
 *
 * Üç kutu (işveren / taşeron kırılımı / brüt kâr) + iki bağlantı. Tutarlar
 * KPI şeridiyle AYNI türevden gelir (`computeDiarySummaryKpis`) — panel kendi
 * hesabını yapmaz, bu yüzden şeritle panel arasında sapma olamaz.
 */
export function DiarySummaryProfitPanel({
  kpis,
  subcontractorPaymentsHref,
  employerPaymentsHref,
}: DiarySummaryProfitPanelProps) {
  return (
    <section className="diary-card diary-card--flush" aria-labelledby="diary-profit-title">
      {/* HÖ176 */}
      <h2 className="diary-card__title diary-card__title--bar" id="diary-profit-title">
        Taşeron vs İşveren — Karlılık Analizi
      </h2>

      <div className="diary-profit">
        {/* HÖ179-185 — işveren kutusu; çubuk referans (%100) */}
        <div className="diary-profit__box">
          <div className="diary-profit__row">
            <span className="diary-profit__row-label">İşveren Hakediş</span>
            <span className="diary-profit__row-value diary-profit__row-value--employer">
              {kpis.employerTotal === null ? "—" : formatCurrencyPrecise(kpis.employerTotal)}
            </span>
          </div>
          <div className="diary-profit__bar diary-profit__bar--employer">
            <div
              className="diary-profit__bar-fill diary-profit__bar-fill--employer"
              style={{ width: kpis.employerTotal === null ? "0%" : "100%" }}
            />
          </div>
          {kpis.employerPendingReason !== null && (
            <p className="diary-profit__note">{kpis.employerPendingReason}</p>
          )}
        </div>

        {/* HÖ187-210 — taşeron kırılımı */}
        <div className="diary-profit__box">
          <h3 className="diary-profit__box-title">Taşeron Ödemeleri</h3>

          {kpis.subcontractorPendingReason !== null && (
            <p className="diary-profit__note">{kpis.subcontractorPendingReason}</p>
          )}

          {kpis.subcontractorPendingReason === null && kpis.subcontractorBars.length === 0 && (
            <p className="diary-profit__note">Bu ay bu şantiyede taşeron hakedişi yok.</p>
          )}

          {kpis.subcontractorBars.length > 0 && (
            <ul className="diary-profit__list">
              {kpis.subcontractorBars.map((bar, index) => (
                <li className="diary-profit__list-item" key={bar.name}>
                  {/* HÖ190-193 */}
                  <div className="diary-profit__row">
                    <span className="diary-profit__row-name">{bar.name}</span>
                    <span className="diary-profit__row-value">
                      {formatCurrencyPrecise(bar.grossTotal)}
                    </span>
                  </div>
                  {/* HÖ194/199/204 — en büyük pay kırmızı, diğerleri turuncu
                      (mockup'ın renk sırası; satırlar tutara göre azalandır) */}
                  <div className="diary-profit__bar">
                    <div
                      className={`diary-profit__bar-fill${
                        index === 0 ? "" : " diary-profit__bar-fill--minor"
                      }`}
                      style={{ width: `${bar.widthPct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* HÖ206-209 */}
          <div className="diary-profit__row diary-profit__row--total">
            <span className="diary-profit__row-label">Toplam Taşeron</span>
            <span className="diary-profit__row-value diary-profit__row-value--danger">
              {kpis.subcontractorTotal === null
                ? "—"
                : formatCurrencyPrecise(kpis.subcontractorTotal)}
            </span>
          </div>
        </div>

        {/* HÖ212-223 — brüt kâr kutusu */}
        <div className="diary-profit__box diary-profit__box--profit">
          <div className="diary-profit__profit">
            <div>
              <p className="diary-profit__profit-label">Brüt Kar (Bu Ay)</p>
              {/* HÖ216 — "2.100.000 − 1.160.000" */}
              <p className="diary-profit__profit-formula">
                {kpis.profitFormula === null
                  ? "Hesap gösterilemiyor."
                  : `${formatAmount(kpis.profitFormula.employer)} − ${formatAmount(
                      kpis.profitFormula.subcontractor,
                    )}`}
              </p>
            </div>
            <div className="diary-profit__profit-figures">
              <p className="diary-profit__profit-value">
                {kpis.grossProfit === null ? "—" : formatCurrencyPrecise(kpis.grossProfit)}
              </p>
              <p className="diary-profit__profit-margin">
                {kpis.grossMarginPct === null
                  ? "Marj hesaplanamadı."
                  : `${formatPercent(kpis.grossMarginPct)} marj`}
              </p>
            </div>
          </div>
        </div>

        {/* HÖ225-228 */}
        <div className="diary-profit__actions">
          <Link
            className="diary-profit__action diary-profit__action--subcontractor"
            href={subcontractorPaymentsHref}
          >
            Taşeron Hakediş →
          </Link>
          <Link
            className="diary-profit__action diary-profit__action--employer"
            href={employerPaymentsHref}
          >
            İşveren Hakediş →
          </Link>
        </div>
      </div>
    </section>
  );
}

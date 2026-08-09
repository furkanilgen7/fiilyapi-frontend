import { formatCompactCurrency, formatQuantity } from "@/lib/format";
import type {
  ContractDistributionGroup,
  ContractDistributionSiteSummary,
} from "@/lib/api/hooks/useContract";

import {
  buildUnitByItemCode,
  distributionSiteAccent,
  distributionSiteSummaryTitle,
  resolveSiteItemUnit,
} from "./distribution-derive";
import "./contract-distribution.css";

/**
 * POZ 168-187 · şantiye kota özeti kartları.
 *
 * ⚠️ BİRİM İSTEMCİDE JOIN'LENİR: `ContractDistributionSiteItem` şemasında
 * `unit` alanı YOKTUR (mockup 172-174 "1.900 m³" yazar). Birim aynı yanıtın
 * `groups[].items[]` tarafındadır ve iki tarafı POZ NUMARASI (`code`)
 * birleştirir. Kod eşleşmezse birim BASILMAZ — uydurma birim sahada yanlış
 * karar verdirir (`distribution-derive.ts` testli).
 *
 * Kart sayısı da DİNAMİKTİR (mockup iki blok çizer; kaynak `site_summaries`).
 */
export interface ContractDistributionSiteSummariesProps {
  summaries: readonly ContractDistributionSiteSummary[];
  groups: readonly ContractDistributionGroup[];
}

export function ContractDistributionSiteSummaries({
  summaries,
  groups,
}: ContractDistributionSiteSummariesProps) {
  if (summaries.length === 0) return null;
  const unitByCode = buildUnitByItemCode(groups);

  return (
    <div className="cdist-summaries">
      {summaries.map((summary, index) => (
        <section
          key={summary.site_id}
          className={`cdist-summary cdist-accent-${distributionSiteAccent(index)}`}
          aria-labelledby={`cdist-summary-${summary.site_id}`}
          data-testid="cdist-summary-card"
        >
          {/* 170 */}
          <h2 className="cdist-summary__title" id={`cdist-summary-${summary.site_id}`}>
            🏗 {distributionSiteSummaryTitle(summary.site_name)} — Kota Özeti
          </h2>

          <div className="cdist-summary__rows">
            {summary.items.length === 0 ? (
              <p className="cdist-summary__empty">Bu şantiyeye henüz kota atanmadı.</p>
            ) : (
              summary.items.map((item) => {
                const unit = resolveSiteItemUnit(unitByCode, item.code);
                return (
                  // 172-174
                  <div className="cdist-summary__row" key={item.code}>
                    <span className="cdist-summary__row-label">{item.description}</span>
                    <span className="cdist-summary__row-value" data-testid="cdist-summary-qty">
                      {formatQuantity(item.quantity)}
                      {unit === null ? "" : ` ${unit}`}
                    </span>
                  </div>
                );
              })
            )}
            {/* 175 */}
            <div className="cdist-summary__total">
              <span>{summary.site_name} Toplam Bedel</span>
              <span className="cdist-summary__total-value" data-testid="cdist-summary-total">
                {formatCompactCurrency(summary.total_amount)}
              </span>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

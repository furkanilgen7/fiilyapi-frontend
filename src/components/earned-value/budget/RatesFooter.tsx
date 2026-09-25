"use client";

import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { EvBudgetView } from "@/lib/api/models";

import { formatMhr } from "./budget-format";
import { emptyRateCount } from "./freeze-findings";

interface RatesFooterProps {
  view: EvBudgetView;
  /** Doğrudan bütçeli disiplinsiz grup sayısı (yalnız taslakta anlamlı). */
  disciplinelessCount: number;
  onNext: () => void;
}

/**
 * Yapışkan alt toplam şeridi — Adam-Saat Bütçesi.dc.html:272-277 + Ek Formlar
 * M1 (a) ikinci çip "Disiplinsiz: 2 doğrudan bütçeli grup". Sayılar backend'den.
 */
export function RatesFooter({ view, disciplinelessCount, onNext }: RatesFooterProps) {
  const empty = emptyRateCount(view);
  return (
    <div className="ev-budget-footer">
      <div className="ev-budget-footer__stat">
        <span className="ev-budget-footer__caption">Toplam bütçe · doğrudan</span>
        <span className="ev-budget-footer__total">
          {formatMhr(view.totals.direct_budget_mhr)} <span className="ev-budget-footer__unit">a-s</span>
        </span>
      </div>
      <div className="ev-budget-footer__stat">
        <span className="ev-budget-footer__caption">Dolaylı · bütçe dışı</span>
        <span className="ev-budget-footer__value">{formatMhr(view.totals.indirect_budget_mhr)} a-s</span>
      </div>
      <div className="ev-budget-footer__stat">
        <span className="ev-budget-footer__caption">Kalem</span>
        <span className="ev-budget-footer__value">{view.totals.leaf_count} bölüm satırı</span>
      </div>
      {disciplinelessCount > 0 && (
        <span className="ev-budget-pill ev-budget-pill--danger">
          <span className="ev-budget-pill__dot" aria-hidden="true" />
          Disiplinsiz: {disciplinelessCount} doğrudan bütçeli grup
        </span>
      )}
      <span className={cx("ev-budget-pill", empty > 0 ? "ev-budget-pill--danger" : "ev-budget-pill--ok")}>
        <span className="ev-budget-pill__dot" aria-hidden="true" />
        {empty > 0 ? `Oranı boş: ${empty} kalem` : "Bütün oranlar girildi"}
      </span>
      <Button className="ev-budget-footer__next" onClick={onNext}>
        İleri: Zamanlama →
      </Button>
    </div>
  );
}

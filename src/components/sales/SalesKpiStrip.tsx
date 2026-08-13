import { formatCompactCurrency, formatPercent } from "@/lib/format";
import type { SalesSummaryResponse } from "@/lib/api/hooks/useSalesSummary";

import { COLLECTION_PCT_UNKNOWN_REASON } from "./sales-labels";
import "./sales.css";

export interface SalesKpiStripProps {
  /** Yükleniyor/hata durumunda `undefined` — sahte sıfır BASILMAZ. */
  summary: SalesSummaryResponse | undefined;
}

/** Değer basılamıyorken tüm kartların ortak yer tutucusu. */
const EMPTY_VALUE = "—";

/**
 * SY 54-60 · KPI şeridi — BEŞ kart, sırasıyla: Satılan (Tapulu) (55) ·
 * Rezerve (56) · Boş Ünite (57) · Tahsil Edilen (58) · Vadesi Geçen (59).
 *
 * ⚠️ BEŞİNİN DE TEK KAYNAĞI `GET /projects/{id}/sales/summary`dir. Ekran hiçbir
 * KPI'yı HESAPLAMAZ: "Boş Ünite" için ayrı bir ünite ucuna gidilmez
 * (`available_units`), tahsilat yüzdesi bölme ile bulunmaz (`collection_pct`
 * sunucudan; sözleşme tutarı 0 iken `null` → "—" + görünür gerekçe).
 */
export function SalesKpiStrip({ summary }: SalesKpiStripProps) {
  const collectionPct = summary?.collection.collection_pct ?? null;

  return (
    <div className="satis-kpi" data-testid="satis-kpi-strip">
      {/* 55 */}
      <div className="satis-kpi__card satis-kpi__card--sold">
        <div className="satis-kpi__label">Satılan (Tapulu)</div>
        <div className="satis-kpi__value satis-kpi__value--success">
          {summary ? summary.sold.count : EMPTY_VALUE}
        </div>
        <div className="satis-kpi__hint">
          {summary ? formatCompactCurrency(summary.sold.amount) : EMPTY_VALUE}
        </div>
      </div>

      {/* 56 */}
      <div className="satis-kpi__card satis-kpi__card--reserved">
        <div className="satis-kpi__label">Rezerve</div>
        <div className="satis-kpi__value satis-kpi__value--warning">
          {summary ? summary.reserved.count : EMPTY_VALUE}
        </div>
        <div className="satis-kpi__hint">
          {summary ? `${formatCompactCurrency(summary.reserved.amount)} potansiyel` : EMPTY_VALUE}
        </div>
      </div>

      {/* 57 */}
      <div className="satis-kpi__card">
        <div className="satis-kpi__label">Boş Ünite</div>
        <div className="satis-kpi__value satis-kpi__value--muted">
          {summary ? summary.available_units.count : EMPTY_VALUE}
        </div>
        <div className="satis-kpi__hint">
          {summary
            ? `${formatCompactCurrency(summary.available_units.list_price_total)} stok`
            : EMPTY_VALUE}
        </div>
      </div>

      {/* 58 — yüzde SUNUCUDAN; `null` ise uydurma oran YOK */}
      <div className="satis-kpi__card">
        <div className="satis-kpi__label">Tahsil Edilen</div>
        <div className="satis-kpi__value satis-kpi__value--primary satis-kpi__value--money">
          {summary ? formatCompactCurrency(summary.collection.collected_amount) : EMPTY_VALUE}
        </div>
        {collectionPct === null ? (
          <div
            className="satis-kpi__hint satis-kpi__hint--pending"
            title={COLLECTION_PCT_UNKNOWN_REASON}
            data-testid="satis-kpi-collection-pct"
          >
            {EMPTY_VALUE} tahsilat
          </div>
        ) : (
          <div className="satis-kpi__hint" data-testid="satis-kpi-collection-pct">
            {formatPercent(collectionPct)} tahsilat
          </div>
        )}
      </div>

      {/* 59 */}
      <div className="satis-kpi__card satis-kpi__card--overdue">
        <div className="satis-kpi__label">Vadesi Geçen</div>
        <div className="satis-kpi__value satis-kpi__value--danger satis-kpi__value--money">
          {summary ? formatCompactCurrency(summary.overdue.amount) : EMPTY_VALUE}
        </div>
        <div className="satis-kpi__hint">
          {summary ? `${summary.overdue.installment_count} taksit` : EMPTY_VALUE}
        </div>
      </div>
    </div>
  );
}

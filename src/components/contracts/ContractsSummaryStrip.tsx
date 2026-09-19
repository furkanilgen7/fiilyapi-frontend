import { formatCompactCurrency } from "@/lib/format";
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
 * 🔴 ZARİF DÜŞÜŞ — GEREKÇE KALDIRILDI (F-KAPSAM, 2026-09-19).
 *
 * Eski not *"`progress_payment_total` TAŞERON sekmesinde backend'de `None`dır"*
 * diyordu ve kart o `null`a "Taşeron hakediş toplamı bu görünüme gelmedi"
 * gerekçesini yazıyordu. O gerekçe ÖLDÜ; kodda ÖLÇÜLDÜ, varsayılmadı:
 *
 *   · `contracts/service.py:264` (işveren) ve `:289` (taşeron) — İKİ dal da
 *     `_quantize_money(sum(..., Decimal("0")))` döndürür. Boş küme bile `0.00`
 *     üretir; sunucunun `None` döndüreceği bir yol KALMAMIŞTIR (TH-SUM dilimi
 *     taşeron dalını bağladı).
 *   · `contracts/schemas.py:116` — alan `Gorunurluk.para` etiketlidir.
 *
 * Yani yanıttaki `null`un TEK kaynağı kapsam maskesidir: anlamı "bu yüzeye
 * gelmedi" DEĞİL "bu tutarı görmeye yetkin yok"tur. İki hâli aynı cümleyle
 * anlatmak ekranı yalancı yapar (`projects/schemas.py::restricted` kanonu).
 * Kart yine SİLİNMEZ — "—" basar, ipucu VERİLMEZ (`placeholder-cell.ts` 3.
 * hâli). `null` dalı savunmacı olarak KALIR: şema tipi hâlâ `Decimal | None`.
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
            data-testid="szl-kpi-payment-total"
          >
            —
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

import { formatAmount, formatCurrencyPrecise, formatPercent } from "@/lib/format";
import type { SiteDiarySummary } from "@/lib/api/hooks/useSiteDiary";

import { clampWidthPct } from "./summary-kpis";

/**
 * HÖ142/148/154/160 · yüzde çubuğunun rengi mockup'ta ikilidir: %75/%60/%80
 * mavi, %48 turuncu. Eşik mockup'tan okunur — %50'nin ALTI uyarı tonudur.
 */
const LOW_COMPLETION_THRESHOLD = 50;

export interface DiarySummaryAccrualTableProps {
  summary: SiteDiarySummary | undefined;
  isLoading: boolean;
  isError: boolean;
}

/**
 * HÖ126-172 · "İş Kalemi Bazlı Hakediş Birikimi" tablosu.
 *
 * Kaynak: `GET /sites/{site_id}/diary/summary?year&month` — poz bazlı aylık
 * toplamlar, YALNIZ `submitted` günler (uç sözleşmesi). Ekran ikinci bir istek
 * atmaz, türev hesaplamaz: `amount`/`boq_amount`/`completion_ratio`/
 * `total_amount` yanıttan olduğu gibi basılır.
 *
 * tfoot'un "Sözleşme" hücresi BOŞ bırakılır — mockup'ta da boştur (HÖ166);
 * sözleşme sütununun toplamı İCAT EDİLMEZ.
 */
export function DiarySummaryAccrualTable({
  summary,
  isLoading,
  isError,
}: DiarySummaryAccrualTableProps) {
  const items = summary?.items ?? [];

  return (
    <section className="diary-card diary-card--flush" aria-labelledby="diary-summary-table-title">
      {/* HÖ127 */}
      <h2 className="diary-card__title diary-card__title--bar" id="diary-summary-table-title">
        İş Kalemi Bazlı Hakediş Birikimi
      </h2>

      {isError && <p className="diary__message diary__message--inset">Aylık birikim yüklenemedi</p>}
      {!isError && isLoading && (
        <p className="diary__message diary__message--inset">Yükleniyor…</p>
      )}
      {!isError && !isLoading && items.length === 0 && (
        <p className="diary__message diary__message--inset">
          Bu ay gönderilmiş günlük kayıt yok — birikim tablosu boş. (Taslak günler bu tabloya
          girmez.)
        </p>
      )}

      {!isError && !isLoading && items.length > 0 && (
        <table className="diary-summary-table">
          <thead>
            <tr>
              {/* HÖ131-134 */}
              <th scope="col" className="diary-summary-table__col-item">
                İş Kalemi
              </th>
              <th scope="col" className="diary-summary-table__col-amount">
                Sözleşme
              </th>
              <th
                scope="col"
                className="diary-summary-table__col-amount diary-summary-table__col-month"
              >
                Bu Ay
              </th>
              <th scope="col" className="diary-summary-table__col-pct">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ratio = item.completion_ratio;
              const isLow = ratio !== null && Number(ratio) < LOW_COMPLETION_THRESHOLD;
              return (
                <tr key={item.boq_item_id}>
                  {/* HÖ139 */}
                  <td className="diary-summary-table__item">
                    <span className="diary-summary-table__item-name">{item.description}</span>
                    <span className="diary-summary-table__item-meta">
                      {item.code} · {item.unit}
                    </span>
                  </td>
                  {/* HÖ140 */}
                  <td className="diary-summary-table__amount">{formatAmount(item.boq_amount)}</td>
                  {/* HÖ141 */}
                  <td className="diary-summary-table__amount diary-summary-table__amount--month">
                    {formatAmount(item.amount)}
                  </td>
                  {/* HÖ142 */}
                  <td className="diary-summary-table__pct">
                    <div className="diary-summary-table__bar">
                      <div
                        className={`diary-summary-table__bar-fill${
                          isLow ? " diary-summary-table__bar-fill--low" : ""
                        }`}
                        style={{ width: `${clampWidthPct(ratio)}%` }}
                      />
                    </div>
                    <span
                      className={`diary-summary-table__pct-label${
                        isLow ? " diary-summary-table__pct-label--low" : ""
                      }`}
                    >
                      {ratio === null ? "—" : formatPercent(ratio)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* HÖ164-169 */}
            <tr className="diary-summary-table__total-row">
              <td>Bu Ay Toplam</td>
              {/* HÖ166 — mockup'ta BOŞ; sözleşme toplamı icat edilmez */}
              <td />
              <td className="diary-summary-table__total-amount">
                {formatCurrencyPrecise(summary?.total_amount ?? "0")}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}

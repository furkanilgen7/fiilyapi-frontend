import Link from "next/link";

import { formatCurrencyPrecise } from "@/lib/format";

import type { DiaryAccrual } from "./payment-accrual";

export interface DiaryPaymentAccrualCardProps {
  accrual: DiaryAccrual;
  /** GK388 başlığındaki ay adı ("Temmuz"). */
  monthLabel: string;
  /** GK406 "Hakedişler →" — şantiyenin Hakedişler sekmesi. */
  paymentsHref: string;
  /** GK407 "Hakediş Oluştur" — yazma izni yoksa `null` (buton basılmaz). */
  createHref: string | null;
}

/**
 * GK387-413 · "💰 <Ay> Hakediş Birikimi" kartı — tüm satırlar GERÇEK veriden
 * (`payment-accrual.ts` türevleri).
 *
 * Kırpılma/hata durumunda tutar SESSİZCE sıfırlanmaz: satır yerine "—" ve
 * GÖRÜNÜR gerekçe basılır (F-TH korkuluğu).
 */
export function DiaryPaymentAccrualCard({
  accrual,
  monthLabel,
  paymentsHref,
  createHref,
}: DiaryPaymentAccrualCardProps) {
  return (
    <section className="diary-card diary-card--side" aria-labelledby="diary-accrual-title">
      {/* GK388 */}
      <h2 className="diary-card__title" id="diary-accrual-title">
        💰 {monthLabel} Hakediş Birikimi
      </h2>
      <div className="diary-accrual__rows">
        {/* GK390-393 */}
        <div className="diary-accrual__row">
          <span className="diary-accrual__label">İşveren Hakediş</span>
          {accrual.employerTotal === null ? (
            <span className="diary-accrual__value diary-accrual__value--pending">—</span>
          ) : (
            <span className="diary-accrual__value diary-accrual__value--employer">
              {formatCurrencyPrecise(accrual.employerTotal)}
            </span>
          )}
        </div>

        {/* GK394-403 — taşeron başına bir satır */}
        {accrual.subcontractorRows === null ? (
          <div className="diary-accrual__row">
            <span className="diary-accrual__label">Taşeron Ödemeleri</span>
            <span className="diary-accrual__value diary-accrual__value--pending">—</span>
          </div>
        ) : accrual.subcontractorRows.length === 0 ? (
          <p className="diary-accrual__empty">Bu ay taşeron hakedişi yok.</p>
        ) : (
          accrual.subcontractorRows.map((row) => (
            <div className="diary-accrual__row" key={row.name}>
              <span className="diary-accrual__label">Taşeron — {row.name}</span>
              <span className="diary-accrual__value diary-accrual__value--subcontractor">
                {formatCurrencyPrecise(row.grossTotal)}
              </span>
            </div>
          ))
        )}

        {/* GK404-407 */}
        <div className="diary-accrual__row diary-accrual__row--profit">
          <span className="diary-accrual__label diary-accrual__label--profit">
            Brüt Kar (Bu Ay)
          </span>
          {accrual.grossProfit === null ? (
            <span className="diary-accrual__value diary-accrual__value--pending">—</span>
          ) : (
            <span className="diary-accrual__value diary-accrual__value--profit">
              {formatCurrencyPrecise(accrual.grossProfit)}
            </span>
          )}
        </div>
      </div>

      {accrual.employerPendingReason !== null && (
        <p className="diary-accrual__note">{accrual.employerPendingReason}</p>
      )}
      {accrual.subcontractorPendingReason !== null && (
        <p className="diary-accrual__note">{accrual.subcontractorPendingReason}</p>
      )}
      {/* Zarif düşüş bildirimi (CLAUDE.md): işveren hakedişi PROJE düzeyi bir
          kayıttır (F-TH kararı S4) — şantiye başına ayrı bir işveren toplamı
          uçtan gelmez, tutar projenin tamamını kapsar. */}
      <p className="diary-accrual__note">
        İşveren hakedişi proje düzeyinde tutulur; tutar projenin tamamını kapsar.
      </p>

      {/* GK409-412 */}
      <div className="diary-accrual__actions">
        <Link className="diary-accrual__action" href={paymentsHref}>
          Hakedişler →
        </Link>
        {createHref !== null && (
          <Link
            className="diary-accrual__action diary-accrual__action--primary"
            href={createHref}
          >
            Hakediş Oluştur
          </Link>
        )}
      </div>
    </section>
  );
}

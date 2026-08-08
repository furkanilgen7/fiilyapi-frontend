import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import { formatCurrencyPrecise, formatPeriodShort } from "@/lib/format";
import { PAYMENT_STATUS_BADGE } from "@/components/progress-payments/shared/status";
import type { SubcontractorProgressPaymentListItem } from "@/lib/api/hooks/useSubcontractorProgressPayments";

import "./employer-contract-detail.css";
import "./subcontractor-contract-detail.css";

/**
 * TSD 185-204 · "Hakediş Geçmişi".
 *
 * 🛑 Kaynak `GET /subcontractor-progress-payments`tir ve uçta **`contract_id`
 * filtresi YOKTUR** (openapi teyidi) → sunucuda PROJE filtresi, sözleşme
 * süzmesi İSTEMCİDE (bkz. `useSubcontractorContractPayments`). Liste sunucu
 * tavanında kırpıldıysa bu tablo EKSİK olabilir; sessiz kırpma yasak — görünür
 * bant basılır.
 *
 * Kolonlar 192-196: Hakediş (`#{sequence_no}`) · Dönem (`Tem 2026`) · Tutar
 * (BRÜT — 199'daki ₺1.240.000, F-TH'nin "Brüt Tutar" hücresiyle aynı kanıt) ·
 * Durum (ortak rozet tablosu) · Detay linki.
 */
export interface SubcontractorContractPaymentsCardProps {
  items: readonly SubcontractorProgressPaymentListItem[];
  isLoading: boolean;
  isError: boolean;
  /** Kırpılma bandı; yoksa `null`. */
  truncationMessage: string | null;
  /** 188 · "+ Yeni Hakediş →" hedefi (sözleşme önseçili). */
  newPaymentHref: string;
}

const DASH = "—";

export function SubcontractorContractPaymentsCard({
  items,
  isLoading,
  isError,
  truncationMessage,
  newPaymentHref,
}: SubcontractorContractPaymentsCardProps) {
  return (
    <section className="tsd-payments" aria-labelledby="tsd-payments-title">
      <div className="tsd-payments__head">
        <span className="tsd-payments__title" id="tsd-payments-title">
          Hakediş Geçmişi
        </span>
        <Link href={newPaymentHref} className="tsd-payments__new">
          + Yeni Hakediş →
        </Link>
      </div>

      {truncationMessage && (
        <p className="tsd-items__notice" data-testid="tsd-payments-limit-note">
          {truncationMessage}
        </p>
      )}

      {isError ? (
        <p className="ecd-empty">Hakediş listesi yüklenemedi.</p>
      ) : isLoading ? (
        <p className="ecd-empty">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p className="ecd-empty">Bu sözleşmede henüz hakediş yok.</p>
      ) : (
        <div className="ecd-items__scroll">
          <table className="ecd-items__table">
            <thead>
              <tr>
                <th className="ecd-items__th ecd-items__th--lead">Hakediş</th>
                <th className="ecd-items__th ecd-items__th--center">Dönem</th>
                <th className="ecd-items__th ecd-items__th--right">Tutar</th>
                <th className="ecd-items__th ecd-items__th--center">Durum</th>
                <th className="ecd-items__th ecd-items__th--center" />
              </tr>
            </thead>
            <tbody>
              {items.map((payment) => {
                const badge = PAYMENT_STATUS_BADGE[payment.status];
                return (
                  <tr className="ecd-items__row" key={payment.id}>
                    <td className="ecd-items__td tsd-payments__seq">#{payment.sequence_no}</td>
                    <td className="ecd-items__td ecd-items__td--center">
                      {payment.period_year !== null && payment.period_month !== null
                        ? formatPeriodShort(payment.period_year, payment.period_month)
                        : DASH}
                    </td>
                    <td className="ecd-items__td ecd-items__td--qty">
                      {formatCurrencyPrecise(payment.gross_total)}
                    </td>
                    <td className="ecd-items__td ecd-items__td--center">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="ecd-items__td ecd-items__td--center">
                      <Link
                        href={`/hakedisler/taseron/${payment.id}`}
                        className="tsd-payments__detail"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

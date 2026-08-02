import { cx } from "@/lib/cx";
import { formatAmount, formatCurrencyPrecise, formatPercent } from "@/lib/format";
import type { ProgressPaymentDetail } from "@/lib/api/hooks/useProgressPayments";

export interface PaymentCalculationCardProps {
  detail: Pick<ProgressPaymentDetail, "calculation" | "vat_pct" | "advance_pct" | "retainage_pct">;
}

// E15 149-174 "Ödeme Hesabı" kartı (spec §6.2-§6.4). Satır etiketleri
// mockup'tan birebir (154, 158, 162, 166, 170); oranlar detay yanıtındaki
// `*_pct` alanlarından (brief §4). Ara satırlar `₺` taşımaz (mockup
// 155/159/163/167), yalnız Net Tahsil (171) `₺` öneki + vurgulu kutu alır.
export function PaymentCalculationCard({ detail }: PaymentCalculationCardProps) {
  const { calculation } = detail;
  return (
    <section className="pp-calc-card">
      <h2 className="pp-calc-card__title">Ödeme Hesabı</h2>
      <div className="pp-calc-card__rows">
        <CalcRow label="Brüt Hakediş" value={formatAmount(calculation.gross)} />
        <CalcRow
          label={`KDV (${formatPercent(detail.vat_pct)})`}
          value={`+ ${formatAmount(calculation.vat)}`}
          tone="positive"
        />
        <CalcRow
          label={`Avans Kesintisi (${formatPercent(detail.advance_pct)})`}
          value={`- ${formatAmount(calculation.advance_deduction)}`}
          tone="negative"
        />
        <CalcRow
          label={`Teminat Kesintisi (${formatPercent(detail.retainage_pct)})`}
          value={`- ${formatAmount(calculation.retention)}`}
          tone="negative"
        />
        <div className="pp-calc-card__net">
          <span className="pp-calc-card__net-label">Net Tahsil</span>
          <span className="pp-calc-card__net-value">{formatCurrencyPrecise(calculation.net)}</span>
        </div>
      </div>
    </section>
  );
}

function CalcRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="pp-calc-row">
      <span className="pp-calc-row__label">{label}</span>
      <span className={cx("pp-calc-row__value", tone && `pp-calc-row__value--${tone}`)}>{value}</span>
    </div>
  );
}

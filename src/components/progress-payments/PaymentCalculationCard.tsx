import { cx } from "@/lib/cx";
import type { ProgressPaymentDetail } from "@/lib/api/hooks/useProgressPayments";
import { buildPaymentCalculationRows } from "./shared/payment-calculation-rows";

export interface PaymentCalculationCardProps {
  detail: Pick<ProgressPaymentDetail, "calculation" | "vat_pct" | "advance_pct" | "retainage_pct">;
}

// E15 149-174 "Ödeme Hesabı" kartı (spec §6.2-§6.4). Satır etiketleri
// mockup'tan birebir (154, 158, 162, 166, 170); oranlar detay yanıtındaki
// `*_pct` alanlarından (brief §4). Ara satırlar `₺` taşımaz (mockup
// 155/159/163/167), yalnız Net Tahsil (171) `₺` öneki + vurgulu kutu alır.
// F-TH T3'te satır üretimi `shared/payment-calculation-rows.ts`e ÇIKARILDI
// (Taşeron tfoot'unun aynı hesap kaynağını PAYLAŞMASI için) — bu bileşenin
// GÖRÜNEN davranışı/metinleri DEĞİŞMEDİ, yalnız iç yapı ortaklaştı.
export function PaymentCalculationCard({ detail }: PaymentCalculationCardProps) {
  const rows = buildPaymentCalculationRows(
    detail.calculation,
    detail,
    { grossLabel: "Brüt Hakediş", netLabel: "Net Tahsil" },
  );
  return (
    <section className="pp-calc-card">
      <h2 className="pp-calc-card__title">Ödeme Hesabı</h2>
      <div className="pp-calc-card__rows">
        {rows.slice(0, 4).map((row) => (
          <CalcRow key={row.key} label={row.label} value={row.value} tone={row.tone} />
        ))}
        <div className="pp-calc-card__net">
          <span className="pp-calc-card__net-label">{rows[4].label}</span>
          <span className="pp-calc-card__net-value">{rows[4].value}</span>
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

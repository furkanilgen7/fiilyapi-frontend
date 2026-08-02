import { formatCompactCurrency, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

import { computeProgressPaymentsTotals } from "./totals";
import "./progress-payments-totals.css";

/**
 * Proje bağlamı bilinen ekranlardan (T6 şantiye sekmesi) gelen özet verisi
 * (coordinator review round 2). `useProgressPaymentSummary`nin
 * `payment_count`/`progress_pct` alanlarından türetilir — proje bağlamı
 * olmayan ekranlarda (T2 `/hakedisler`, tek proje yok → özet çağrılamaz)
 * bu prop HİÇ verilmez.
 */
export interface ProgressPaymentsTotalsSummary {
  paymentCount: number;
  /** null gelebilir (sözleşme bedeli eksik) — o zaman yüzde BASILMAZ. */
  progressPct: string | null;
}

export interface ProgressPaymentsTotalsStripProps {
  /** Liste verisi henüz gelmediyse (yükleniyor/hata) şerit HİÇ basılmaz —
   * gerçek kartların değeri `items`den türetildiğinden bilinmeyen bir sayıyı
   * "0" gibi göstermemek için. */
  items?: ProgressPaymentListItem[];
  /** Verilmezse (T2) alt metinde yalnız `items.length` sayısı basılır, yüzde
   * hiç basılmaz. Verilse bile özet sorgusu başarısızsa çağıran taraf bu
   * prop'u `undefined` geçer — sayfa KIRILMAZ, alt metin yüzdesiz kalır
   * (`ProgressPaymentDetailView`deki "özet hata verirse KPI basılmaz"
   * deseninin aynısı). */
  summary?: ProgressPaymentsTotalsSummary;
}

interface RealCard {
  label: string;
  value: string;
  subtitle?: string;
  pendingModule?: undefined;
}
interface PendingCard {
  label: string;
  value?: undefined;
  subtitle?: undefined;
  pendingModule: string;
}
type TotalsCard = RealCard | PendingCard;

// Mockup satır 82: "Toplam İşveren Hakedişi" kartının alt metni "4 hakediş ·
// %75" — sayı HER ZAMAN basılır (T2'de items.length, T6'da backend'in
// payment_count'u tercih edilir — brief: "backend'in doğrusu"). Yüzde yalnız
// `summary` verilmişse VE `progressPct` null değilse eklenir.
function paymentsSubtitle(itemCount: number, summary?: ProgressPaymentsTotalsSummary): string {
  const count = summary ? summary.paymentCount : itemCount;
  const parts = [`${count} hakediş`];
  if (summary && summary.progressPct !== null) {
    parts.push(formatPercent(summary.progressPct));
  }
  return parts.join(" · ");
}

// KPI şeridi (mockup `Şantiye - Hakedişler.dc.html` satır 81-86, T2'nin
// `/hakedisler` genel listesinde de AYNI mockup — coordinator review T6 fix):
// dört karttan ikisi mevcut liste verisinden türetilebilir, ikisi taşeron
// hakediş modülüne bağlıdır (henüz yok). Şerit TAMAMEN atlanmaz — karma
// basılır. `value` ve `pendingModule` AYNI karta AYNI ANDA verilmez (tip
// düzeyinde ayrık union ile zorlanır) — brief'in "available=true ile
// pending_module aynı anda verilmez" kuralının bu ekrandaki karşılığı.
function cardsFrom(
  items: ProgressPaymentListItem[],
  summary?: ProgressPaymentsTotalsSummary,
): TotalsCard[] {
  const { grossTotal, pendingApprovalCount } = computeProgressPaymentsTotals(items);
  return [
    {
      label: "Toplam İşveren Hakedişi",
      value: formatCompactCurrency(grossTotal),
      subtitle: paymentsSubtitle(items.length, summary),
    },
    { label: "Toplam Taşeron Ödemesi", pendingModule: "subcontracts" },
    { label: "Onay Bekleyen", value: String(pendingApprovalCount) },
    { label: "Brüt Kar Marjı", pendingModule: "subcontracts" },
  ];
}

export function ProgressPaymentsTotalsStrip({ items, summary }: ProgressPaymentsTotalsStripProps) {
  if (!items) return null;

  return (
    <div className="ppt" data-testid="pp-totals-strip">
      {cardsFrom(items, summary).map((card) => (
        <div key={card.label} className="ppt__card">
          <div className="ppt__label">{card.label}</div>
          {card.pendingModule ? (
            <div
              className="ppt__value ppt__value--pending"
              data-testid="pp-kpi-pending"
              title={pendingModuleLabel(card.pendingModule)}
            >
              —<span className="sr-only">{pendingModuleLabel(card.pendingModule)}</span>
            </div>
          ) : (
            <>
              <div className="ppt__value" data-testid="pp-kpi-value">
                {card.value}
              </div>
              {card.subtitle && (
                <div className="ppt__subtitle" data-testid="pp-kpi-subtitle">
                  {card.subtitle}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

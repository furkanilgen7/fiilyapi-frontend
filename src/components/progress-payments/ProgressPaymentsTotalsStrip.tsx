import { formatCompactCurrency } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

import { computeProgressPaymentsTotals } from "./totals";
import "./progress-payments-totals.css";

export interface ProgressPaymentsTotalsStripProps {
  /** Liste verisi henüz gelmediyse (yükleniyor/hata) şerit HİÇ basılmaz —
   * gerçek kartların değeri `items`den türetildiğinden bilinmeyen bir sayıyı
   * "0" gibi göstermemek için. */
  items?: ProgressPaymentListItem[];
}

interface RealCard {
  label: string;
  value: string;
  pendingModule?: undefined;
}
interface PendingCard {
  label: string;
  value?: undefined;
  pendingModule: string;
}
type TotalsCard = RealCard | PendingCard;

// KPI şeridi (mockup `Şantiye - Hakedişler.dc.html` satır 81-86, T2'nin
// `/hakedisler` genel listesinde de AYNI mockup — coordinator review T6 fix):
// dört karttan ikisi mevcut liste verisinden türetilebilir, ikisi taşeron
// hakediş modülüne bağlıdır (henüz yok). Şerit TAMAMEN atlanmaz — karma
// basılır. `value` ve `pendingModule` AYNI karta AYNI ANDA verilmez (tip
// düzeyinde ayrık union ile zorlanır) — brief'in "available=true ile
// pending_module aynı anda verilmez" kuralının bu ekrandaki karşılığı.
function cardsFrom(items: ProgressPaymentListItem[]): TotalsCard[] {
  const { grossTotal, pendingApprovalCount } = computeProgressPaymentsTotals(items);
  return [
    { label: "Toplam İşveren Hakedişi", value: formatCompactCurrency(grossTotal) },
    { label: "Toplam Taşeron Ödemesi", pendingModule: "subcontracts" },
    { label: "Onay Bekleyen", value: String(pendingApprovalCount) },
    { label: "Brüt Kar Marjı", pendingModule: "subcontracts" },
  ];
}

export function ProgressPaymentsTotalsStrip({ items }: ProgressPaymentsTotalsStripProps) {
  if (!items) return null;

  return (
    <div className="ppt" data-testid="pp-totals-strip">
      {cardsFrom(items).map((card) => (
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
            <div className="ppt__value" data-testid="pp-kpi-value">
              {card.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

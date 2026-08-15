import type { JournalSummaryResponse } from "@/lib/api/hooks/useJournalSummary";
import { formatCurrency } from "@/lib/format";

import { netBalanceTone } from "./accounting-labels";

interface JournalKpiStripProps {
  summary: JournalSummaryResponse | undefined;
}

/** Veri gelmeden sayı UYDURULMAZ: yerinde `—` durur. */
const PLACEHOLDER = "—";

/**
 * E8:78-89 — ÜÇ kart. Şerit dönem seçicisiyle AYNI ızgaradadır (E8:72
 * `auto 1fr 1fr 1fr`), bu yüzden kartlar `mu-strip`in içine basılır.
 *
 * 🔴 Şerit hesap süzgecine BAĞLI DEĞİLDİR (E8:72 — KPI'lar filtre çubuğunun
 * DIŞINDADIR): uç `account_id` parametresi tanımlamaz.
 */
export function JournalKpiStrip({ summary }: JournalKpiStripProps) {
  const netTone = summary === undefined ? "neutral" : netBalanceTone(summary.net_balance);
  return (
    <>
      {/* E8:78-81 */}
      <div className="mu-kpi" data-testid="mu-kpi-debit">
        <div className="mu-kpi__label">Toplam Borç</div>
        <div className="mu-kpi__value mu-kpi__value--danger">
          {summary === undefined ? PLACEHOLDER : formatCurrency(summary.total_debit)}
        </div>
      </div>
      {/* E8:82-85 */}
      <div className="mu-kpi" data-testid="mu-kpi-credit">
        <div className="mu-kpi__label">Toplam Alacak</div>
        <div className="mu-kpi__value mu-kpi__value--success">
          {summary === undefined ? PLACEHOLDER : formatCurrency(summary.total_credit)}
        </div>
      </div>
      {/* E8:86-89 — `net_balance = ALACAK − BORÇ`; işareti RENK söyler. */}
      <div className="mu-kpi" data-testid="mu-kpi-net">
        <div className="mu-kpi__label">Net Bakiye</div>
        <div
          className={
            netTone === "neutral" ? "mu-kpi__value" : `mu-kpi__value mu-kpi__value--${netTone}`
          }
          data-testid="mu-kpi-net-value"
        >
          {summary === undefined ? PLACEHOLDER : formatCurrency(summary.net_balance)}
        </div>
      </div>
    </>
  );
}

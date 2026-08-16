import type { HrLeavesSummaryResponse } from "@/lib/api/hooks/useLeaves";

import { formatDays } from "./leaves-derive";
import {
  KPI_CARRYOVER_RISK_HINT,
  KPI_CARRYOVER_RISK_LABEL,
  KPI_DEBT_LABEL,
  KPI_ON_LEAVE_LABEL,
  KPI_PENDING_LABEL,
  KPI_USED_LABEL,
  UNIT_DAYS,
  UNIT_PEOPLE,
  UNKNOWN_VALUE,
} from "./leaves-labels";
import "./leaves.css";

export interface LeavesKpiStripProps {
  /** Yükleniyor/hata hâlinde `undefined` — sahte sıfır BASILMAZ. */
  summary: HrLeavesSummaryResponse | undefined;
}

/**
 * İZ 45-51 · KPI şeridi — BEŞ kart, mockup sırasıyla: Bekleyen Talep (46) ·
 * Bugün İzinli (47) · Bu Ay Kullanılan (48) · Toplam İzin Borcu (49) ·
 * Devreden Risk (50).
 *
 * ⚠️ Beş sayı da SUNUCUDAN GERÇEKTİR; istemci KPI HESAPLAMAZ ve listelerden
 * türetmez (sunucu listeleri kırpar, türev sayı yalan olurdu).
 *
 * 🔴 ŞEF KARARI — `unknown_entitlement_personnel` BASILMAZ: mockup'ta karşılığı
 * olan bir kart YOKTUR ve KPI İCAT EDİLMEZ. Bilgi kaybolmuyor: hakkı
 * hesaplanamayan personel bakiye tablosunda "Hak yok" satırı olarak zaten
 * görünür (161-167).
 */
export function LeavesKpiStrip({ summary }: LeavesKpiStripProps) {
  return (
    <div className="iz-kpi" data-testid="iz-kpi-strip">
      {/* 46 — sol kenar turuncu */}
      <div className="iz-kpi__card iz-kpi__card--pending">
        <div className="iz-kpi__label">{KPI_PENDING_LABEL}</div>
        <div className="iz-kpi__value iz-kpi__value--pending" data-testid="iz-kpi-pending">
          {summary ? summary.pending_requests : UNKNOWN_VALUE}
        </div>
      </div>

      {/* 47 */}
      <div className="iz-kpi__card">
        <div className="iz-kpi__label">{KPI_ON_LEAVE_LABEL}</div>
        <div className="iz-kpi__value" data-testid="iz-kpi-on-leave">
          {summary ? summary.on_leave_today : UNKNOWN_VALUE}
        </div>
      </div>

      {/* 48 — "82 gün" */}
      <div className="iz-kpi__card">
        <div className="iz-kpi__label">{KPI_USED_LABEL}</div>
        <div className="iz-kpi__value" data-testid="iz-kpi-used">
          {summary ? `${formatDays(summary.days_used_this_month)} ${UNIT_DAYS}` : UNKNOWN_VALUE}
        </div>
      </div>

      {/* 49 — "418 gün" (Decimal string) */}
      <div className="iz-kpi__card">
        <div className="iz-kpi__label">{KPI_DEBT_LABEL}</div>
        <div className="iz-kpi__value iz-kpi__value--debt" data-testid="iz-kpi-debt">
          {summary ? `${formatDays(summary.total_leave_debt)} ${UNIT_DAYS}` : UNKNOWN_VALUE}
        </div>
      </div>

      {/* 50 — sol kenar kırmızı + alt satır */}
      <div className="iz-kpi__card iz-kpi__card--risk">
        <div className="iz-kpi__label">{KPI_CARRYOVER_RISK_LABEL}</div>
        <div className="iz-kpi__value iz-kpi__value--risk" data-testid="iz-kpi-risk">
          {summary ? `${summary.carryover_risk_personnel} ${UNIT_PEOPLE}` : UNKNOWN_VALUE}
        </div>
        <p className="iz-kpi__hint">{KPI_CARRYOVER_RISK_HINT}</p>
      </div>
    </div>
  );
}

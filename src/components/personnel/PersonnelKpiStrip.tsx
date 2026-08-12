import {
  KPI_MONTHLY_COST_PENDING_REASON,
  KPI_ON_LEAVE_PENDING_REASON,
  KPI_ON_SITE_PENDING_REASON,
  PENDING_VALUE,
} from "./personnel-list-labels";
import type { PersonnelKpis } from "./personnel-derive";
import "./personnel-list.css";

export interface PersonnelKpiStripProps {
  /** Yükleniyor/hata durumunda `undefined` — sahte sıfır BASILMAZ. */
  kpis: PersonnelKpis | undefined;
}

/**
 * P 89-114 · KPI şeridi — ALTI kart: Toplam Personel (91-92) · Şirket Kadrosu
 * (95-96, TÜREV) · Taşeron İşçisi (99-100, TÜREV) · Sahada Aktif (103-104,
 * pending) · İzinde (107-108, pending) · Aylık Maliyet (111-112, pending).
 *
 * ⚠️ Son üç kart backend'de HİÇ karşılığı olmayan alanlardır (K4/spec §1) —
 * sahte sayı basmak yerine "—" + görünür gerekçe basılır.
 */
export function PersonnelKpiStrip({ kpis }: PersonnelKpiStripProps) {
  return (
    <div className="personel-kpi" data-testid="personel-kpi-strip">
      {/* 90-93 */}
      <div className="personel-kpi__card">
        <div className="personel-kpi__label">Toplam Personel</div>
        <div className="personel-kpi__value">{kpis ? kpis.total : PENDING_VALUE}</div>
      </div>

      {/* 94-97 — TÜREV, kırpılmada pending'e düşer */}
      <div className="personel-kpi__card personel-kpi__card--company">
        <div className="personel-kpi__label">Şirket Kadrosu</div>
        {kpis && !kpis.isClipped ? (
          <div className="personel-kpi__value personel-kpi__value--company">
            {kpis.companyCount}
          </div>
        ) : (
          <div
            className="personel-kpi__value personel-kpi__value--pending"
            title="Liste kırpıldığı için Şirket Kadrosu sayısı güvenilir değil."
            data-testid="personel-kpi-company-pending"
          >
            {PENDING_VALUE}
          </div>
        )}
      </div>

      {/* 98-101 — TÜREV, kırpılmada pending'e düşer */}
      <div className="personel-kpi__card personel-kpi__card--subcontractor">
        <div className="personel-kpi__label">Taşeron İşçisi</div>
        {kpis && !kpis.isClipped ? (
          <div className="personel-kpi__value personel-kpi__value--subcontractor">
            {kpis.subcontractorCount}
          </div>
        ) : (
          <div
            className="personel-kpi__value personel-kpi__value--pending"
            title="Liste kırpıldığı için Taşeron İşçisi sayısı güvenilir değil."
            data-testid="personel-kpi-subcontractor-pending"
          >
            {PENDING_VALUE}
          </div>
        )}
      </div>

      {/* 102-105 — backend hiç vermiyor */}
      <div className="personel-kpi__card">
        <div className="personel-kpi__label">Sahada Aktif</div>
        <div
          className="personel-kpi__value personel-kpi__value--pending"
          title={KPI_ON_SITE_PENDING_REASON}
          data-testid="personel-kpi-onsite-pending"
        >
          {PENDING_VALUE}
        </div>
        <p className="personel-kpi__pending-hint">{KPI_ON_SITE_PENDING_REASON}</p>
      </div>

      {/* 106-109 — backend hiç vermiyor */}
      <div className="personel-kpi__card">
        <div className="personel-kpi__label">İzinde</div>
        <div
          className="personel-kpi__value personel-kpi__value--pending"
          title={KPI_ON_LEAVE_PENDING_REASON}
          data-testid="personel-kpi-onleave-pending"
        >
          {PENDING_VALUE}
        </div>
        <p className="personel-kpi__pending-hint">{KPI_ON_LEAVE_PENDING_REASON}</p>
      </div>

      {/* 110-113 — backend hiç vermiyor */}
      <div className="personel-kpi__card">
        <div className="personel-kpi__label">Aylık Maliyet</div>
        <div
          className="personel-kpi__value personel-kpi__value--mono personel-kpi__value--pending"
          title={KPI_MONTHLY_COST_PENDING_REASON}
          data-testid="personel-kpi-cost-pending"
        >
          {PENDING_VALUE}
        </div>
        <p className="personel-kpi__pending-hint">{KPI_MONTHLY_COST_PENDING_REASON}</p>
      </div>
    </div>
  );
}

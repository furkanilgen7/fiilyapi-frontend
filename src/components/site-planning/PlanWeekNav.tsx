import { Button } from "@/components/ui/button/Button";

import { formatWeekRange } from "./week";

export interface PlanWeekNavProps {
  weekStart: string;
  weekEnd: string;
  /** Aktif sprint adı; sprint yoksa `null`. */
  sprintName: string | null;
  onShiftWeek: (deltaDays: number) => void;
}

const DAYS_IN_WEEK = 7;

/**
 * P103-108 · ızgara kartının hafta gezinme şeridi.
 *
 * Mockup'ın "21 – 27 Temmuz 2026" sabiti KOPYALANMAZ (tarih artefaktı
 * istisnası) — aralık gerçek takvimden `formatWeekRange` ile üretilir.
 *
 * TÜREV (P107): `active_sprint` `null` olduğunda "Aktif Sprint:" etiketi HİÇ
 * BASILMAZ. Boş bir etiket ("Aktif Sprint: —") mockup'ta olmayan bir bilgi
 * satırı uydururdu; sprint yönetimi T3'ün işidir.
 */
export function PlanWeekNav({ weekStart, weekEnd, sprintName, onShiftWeek }: PlanWeekNavProps) {
  return (
    <div className="plan-week-nav">
      {/* P104 */}
      <Button
        variant="ghost"
        size="sm"
        className="plan-week-nav__arrow"
        aria-label="Önceki hafta"
        onClick={() => onShiftWeek(-DAYS_IN_WEEK)}
      >
        ‹
      </Button>
      {/* P105 — okuyucuya hangi hafta olduğu açıkça söylenir */}
      <span className="plan-week-nav__label" aria-live="polite">
        {formatWeekRange(weekStart, weekEnd)}
      </span>
      {/* P106 */}
      <Button
        variant="ghost"
        size="sm"
        className="plan-week-nav__arrow"
        aria-label="Sonraki hafta"
        onClick={() => onShiftWeek(DAYS_IN_WEEK)}
      >
        ›
      </Button>
      {/* P107 */}
      {sprintName !== null && (
        <span className="plan-week-nav__sprint">Aktif Sprint: {sprintName}</span>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button/Button";

import { PlanSprintEditor } from "./PlanSprintEditor";
import { formatWeekRange } from "./week";

export interface PlanWeekNavProps {
  weekStart: string;
  weekEnd: string;
  /** Taslaktaki aktif sprint adı; boş dize = sprint yok. */
  sprintName: string;
  canWrite: boolean;
  onShiftWeek: (deltaDays: number) => void;
  onChangeSprintName: (name: string) => void;
}

const DAYS_IN_WEEK = 7;

/**
 * P103-108 · ızgara kartının hafta gezinme şeridi.
 *
 * Mockup'ın "21 – 27 Temmuz 2026" sabiti KOPYALANMAZ (tarih artefaktı
 * istisnası) — aralık gerçek takvimden `formatWeekRange` ile üretilir.
 *
 * TÜREV (P107): sprint adı boşken "Aktif Sprint:" etiketi HİÇ BASILMAZ; boş
 * bir etiket ("Aktif Sprint: —") mockup'ta olmayan bir bilgi satırı uydururdu.
 * Sprint düzenlemesi `PlanSprintEditor`dedir (F-PL T3).
 */
export function PlanWeekNav({
  weekStart,
  weekEnd,
  sprintName,
  canWrite,
  onShiftWeek,
  onChangeSprintName,
}: PlanWeekNavProps) {
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
      <PlanSprintEditor name={sprintName} canWrite={canWrite} onChange={onChangeSprintName} />
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button/Button";
import { formatWeekRange } from "@/components/site-planning/week";

import { isoWeekDates, type TimesheetIsoWeek } from "./iso-week";

export interface TimesheetWeekNavProps {
  week: TimesheetIsoWeek;
  onShift: (delta: number) => void;
  onCurrent: () => void;
  /** İçinde bulunulan hafta zaten açıksa "Bu Hafta" bir şey YAPMAZ. */
  isCurrent: boolean;
}

/**
 * Hafta gezinme şeridi (E5 87-96).
 *
 * TARİH ARTEFAKTI İSTİSNASI: mockup'ın "13 – 19 Temmuz 2026 · 29. Hafta"
 * sabiti KOPYALANMAZ — aralık gerçek takvimden `formatWeekRange` ile üretilir
 * (kanon `site-planning/week.ts`, ikinci bir biçimlendirici yazılmaz).
 */
export function TimesheetWeekNav({ week, onShift, onCurrent, isCurrent }: TimesheetWeekNavProps) {
  const days = isoWeekDates(week);
  const start = days[0] ?? "";
  const end = days[days.length - 1] ?? "";

  return (
    <div className="ts-week-nav">
      {/* E5 88 */}
      <div className="ts-week-nav__box">
        <Button
          variant="ghost"
          size="sm"
          className="ts-week-nav__arrow"
          aria-label="Önceki hafta"
          onClick={() => onShift(-1)}
        >
          ‹
        </Button>
        <span className="ts-week-nav__label" aria-live="polite">
          {/* E5 90 */}
          <span className="ts-week-nav__range">{formatWeekRange(start, end)}</span>
          {/* E5 91 */}
          <span className="ts-week-nav__index">{week.isoWeek}. Hafta</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ts-week-nav__arrow"
          aria-label="Sonraki hafta"
          onClick={() => onShift(1)}
        >
          ›
        </Button>
      </div>
      {/* E5 95 — zaten bu haftadaysak devre dışı: tıklanınca hiçbir şey
          olmayan bir düğme kullanıcıya yalan söyler. */}
      <Button
        variant="secondary"
        size="sm"
        className="ts-week-nav__today"
        disabled={isCurrent}
        onClick={onCurrent}
      >
        Bu Hafta
      </Button>
    </div>
  );
}

"use client";

import { cx } from "@/lib/cx";
import { formatDecimal, formatPeriod } from "@/lib/format";
import type { TimesheetWeekSummary } from "@/lib/api/hooks/useTimesheet";

import type { TimesheetIsoWeek } from "./iso-week";

export interface TimesheetMonthWeeksProps {
  year: number;
  month: number;
  weeks: readonly TimesheetWeekSummary[];
  monthTotalHours: string;
  active: TimesheetIsoWeek;
  onSelect: (week: TimesheetIsoWeek) => void;
}

/**
 * Ay içi hafta şeridi (E5 135-168).
 *
 * 🔴 "girilmedi" rozeti (E5 157) `has_entries === false`ten gelir, saat
 * toplamının sıfırlığından DEĞİL: hepsi izinli geçmiş bir hafta GİRİLMİŞTİR ve
 * 0 saattir. İkisini karıştıran ekran, girilmiş bir haftayı boş gösterip
 * kullanıcıyı tekrar girmeye zorlardı (uç `TimesheetWeekSummary` docstring'i).
 *
 * Şerit hafta değiştirmenin İKİNCİ yoludur (birincisi ‹/› okları) — mockup
 * kutuları `cursor:pointer` çizer.
 */
export function TimesheetMonthWeeks({
  year,
  month,
  weeks,
  monthTotalHours,
  active,
  onSelect,
}: TimesheetMonthWeeksProps) {
  return (
    <div className="ts-month-weeks">
      {/* E5 137 */}
      <span className="ts-month-weeks__title">{formatPeriod(year, month)}</span>
      <div className="ts-month-weeks__list">
        {weeks.length === 0 && (
          <span className="ts-month-weeks__empty">Bu ayın hafta özeti yüklenemedi.</span>
        )}
        {weeks.map((week) => {
          const isActive = week.iso_year === active.isoYear && week.iso_week === active.isoWeek;
          return (
            <button
              key={`${week.iso_year}-${week.iso_week}`}
              type="button"
              aria-current={isActive ? "true" : undefined}
              className={cx(
                "ts-month-week",
                isActive && "ts-month-week--active",
                !week.has_entries && "ts-month-week--empty",
              )}
              onClick={() => onSelect({ isoYear: week.iso_year, isoWeek: week.iso_week })}
            >
              {/* E5 140 */}
              <span className="ts-month-week__index">{week.iso_week}. Hafta</span>
              {/* E5 141 */}
              <span className="ts-month-week__range">
                {shortRange(week.start_date, week.end_date)}
              </span>
              {/* E5 142 · 157 */}
              <span className="ts-month-week__value">
                {week.has_entries ? `${formatDecimal(week.total_hours, 1)} sa` : "girilmedi"}
              </span>
            </button>
          );
        })}
      </div>
      {/* E5 165-167 */}
      <span className="ts-month-weeks__total">
        <span className="ts-month-weeks__total-label">Ay Toplamı</span>
        <span className="ts-month-weeks__total-value">
          {formatDecimal(monthTotalHours, 1)} sa
        </span>
      </span>
    </div>
  );
}

const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/**
 * "29 Haz – 5 Tem" (E5 141). Ay değişmiyorsa ay adı BİR KEZ yazılır
 * ("13 – 19 Tem", E5 146) — mockup'ın kendi iki biçimi.
 */
function shortRange(startDate: string, endDate: string): string {
  const [, startMonth, startDay] = startDate.split("-").map(Number);
  const [, endMonth, endDay] = endDate.split("-").map(Number);
  const endName = TR_MONTHS_SHORT[(endMonth ?? 1) - 1] ?? "";
  if (startMonth === endMonth) return `${startDay} – ${endDay} ${endName}`;
  const startName = TR_MONTHS_SHORT[(startMonth ?? 1) - 1] ?? "";
  return `${startDay} ${startName} – ${endDay} ${endName}`;
}

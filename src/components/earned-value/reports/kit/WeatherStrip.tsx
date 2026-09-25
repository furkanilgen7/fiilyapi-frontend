import { cx } from "@/lib/cx";
import { EMPTY_CELL, formatWeekdayShort, formatWindKmh } from "@/lib/format";
import { WEATHER_ICONS } from "@/components/site-diary/weather-icons";
import type { Weather } from "@/lib/api/hooks/useSiteDiary";

import "./weather-strip.css";

/**
 * PLN-F3.4 · Hava şeridi — GİR başlık bloğu 7 gün
 * (`Planlama - Günlük İlerleme Raporu.dc.html:157-166`, yazdırma 310-311).
 *
 * İkonlar `site-diary/weather-icons.ts` TEK kaynağından (F2, 10 durum);
 * `wind_ms` → `formatWindKmh` (çekirdek `lib/format`). Gelecek gün
 * (`day > reportDate`) İSTEMCİ tarafında soluklaştırılır (mockup `op`,
 * backend bu alanı taşımaz).
 */
export interface WeatherStripDay {
  readonly day: string;
  readonly condition: string | null;
  readonly temp_min_c: string | null;
  readonly temp_max_c: string | null;
  readonly wind_ms: string | null;
}

export interface WeatherStripProps {
  days: readonly WeatherStripDay[];
  /** `report_date` — bunun SONRASINDAKİ günler soluk basılır. */
  reportDate: string;
  className?: string;
}

function isKnownWeather(condition: string | null): condition is Weather {
  return condition !== null && WEATHER_ICONS.some((w) => w.value === condition);
}

function tempRange(min: string | null, max: string | null): string {
  if (min === null && max === null) return EMPTY_CELL;
  const lo = min === null ? "?" : String(Math.round(Number(min)));
  const hi = max === null ? "?" : String(Math.round(Number(max)));
  return `${lo}-${hi}°`;
}

export function WeatherStrip({ days, reportDate, className }: WeatherStripProps) {
  return (
    <div className={cx("ev-weather-strip", className)} role="group" aria-label="7 günlük hava durumu">
      {days.map((day) => {
        const isFuture = day.day > reportDate;
        const isReportDay = day.day === reportDate;
        const icon = isKnownWeather(day.condition) ? WEATHER_ICONS.find((w) => w.value === day.condition) : undefined;
        return (
          <div
            key={day.day}
            className={cx(
              "ev-weather-strip__day",
              isFuture && "ev-weather-strip__day--future",
              isReportDay && "ev-weather-strip__day--current",
            )}
          >
            <span className="ev-weather-strip__weekday">{formatWeekdayShort(day.day)}</span>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {icon?.parts.map((part, i) => (
                <path key={i} d={part.d} fill={part.fill} stroke={part.stroke} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
            <span className="ev-weather-strip__temp">{tempRange(day.temp_min_c, day.temp_max_c)}</span>
            <span className="ev-weather-strip__wind">{formatWindKmh(day.wind_ms)}</span>
          </div>
        );
      })}
    </div>
  );
}

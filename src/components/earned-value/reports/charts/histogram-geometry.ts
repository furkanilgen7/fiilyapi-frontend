/**
 * PLN-F3.2b · Haftalık işçi histogramı SAF geometrisi.
 *
 * Kaynak: mockup `Planlama - Panel.dc.html:329-344` (viewBox 460×196).
 * F3-SOZLESME.md §0: backend `histogram: HistogramWeek[]` haftalık
 * planlı/gerçek KİŞİ sayısını ZATEN hesaplar — bu dosya YALNIZ ölçekler.
 *
 * `actual_basis === "equivalent"` (rapor kökündeki alan) → mockup'ın
 * "eşdeğer" lejantı — bu geometri modülü etiketi ÜRETMEZ, yalnız `basis`i
 * AYNEN geri verir; ekran lejant metnini oradan kurar.
 */
import type { EvPanelReport } from "@/lib/api/models";
import { compareDecimalStrings } from "@/lib/earned-value";

import { bandScale, bandWidth, niceAxisMax, tickIndices, valueScale } from "./scale";

export const HG_VIEW_W = 460;
export const HG_VIEW_H = 196;
export const HG_LEFT = 36;
export const HG_RIGHT = 450;
export const HG_TOP = 12;
export const HG_BASE = 160;
const HG_MIN_MAX = 40;
const BAR_INSET = 0.1;
const BAR_RATIO = 0.36;
const MAX_X_TICKS = 6;
const Y_TICK_COUNT = 5;

type HistogramWeek = EvPanelReport["histogram"][number];

export interface HistogramBar {
  weekNo: number | null;
  weekStart: string;
  weekEnd: string | null;
  isFuture: boolean;
  x: number;
  plannedPath: string;
  actualPath: string;
}

export interface HistogramGeometry {
  bars: HistogramBar[];
  yMax: number;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  today: HistogramBar | null;
}

function num(v: string | null): number {
  return v === null ? 0 : Number(v);
}

function isPositive(v: string | null): boolean {
  return v !== null && compareDecimalStrings(v, "0") > 0;
}

function barPath(x: number, width: number, raw: string | null, yMax: number): string {
  if (!isPositive(raw)) return "";
  const top = valueScale(num(raw), 0, yMax, HG_TOP, HG_BASE);
  const height = HG_BASE - top;
  return `M${x} ${HG_BASE}v-${height}h${width}v${height}z`;
}

export function histogramGeometry(
  weeks: readonly HistogramWeek[],
  labelForWeek: (week: HistogramWeek, index: number) => string,
): HistogramGeometry {
  const n = weeks.length;
  if (n === 0) {
    return { bars: [], yMax: HG_MIN_MAX, yTicks: [], xTicks: [], today: null };
  }

  const values = weeks.flatMap((w) => [num(w.planned_people), num(w.actual_people)]);
  // LİDER TALEBİ (P1) — günlük çubuk grafiğiyle ORTAK "güzel sayı" üretici
  // (`niceAxisMax`, charts/scale.ts); önceki `ceil/10*10` küçük değerlerde
  // TESADÜFEN nizami çıkıyordu, artık iki grafik de AYNI kuralı paylaşır.
  const yMax = niceAxisMax(Math.max(0, ...values), Y_TICK_COUNT, HG_MIN_MAX);
  const slot = bandWidth(n, HG_LEFT, HG_RIGHT);
  const barWidth = Math.round(Math.max(1, slot * BAR_RATIO));

  const bars: HistogramBar[] = weeks.map((w, i) => {
    const left = bandScale(i, n, HG_LEFT, HG_RIGHT);
    const plannedX = Math.round(left + slot * BAR_INSET);
    const actualX = Math.round(plannedX + barWidth + 1);
    return {
      weekNo: w.week_no ?? null,
      weekStart: w.week_start,
      weekEnd: w.week_end ?? null,
      isFuture: w.is_future,
      x: plannedX,
      plannedPath: barPath(plannedX, barWidth, w.planned_people, yMax),
      actualPath: w.is_future ? "" : barPath(actualX, barWidth, w.actual_people, yMax),
    };
  });

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = (yMax * i) / (Y_TICK_COUNT - 1);
    return { y: valueScale(value, 0, yMax, HG_TOP, HG_BASE), label: String(Math.round(value)) };
  }).reverse();

  const xTicks = tickIndices(n, MAX_X_TICKS).map((i) => ({
    x: Math.round(bandScale(i, n, HG_LEFT, HG_RIGHT) + slot / 2),
    label: labelForWeek(weeks[i]!, i),
  }));

  const lastKnown = [...bars].reverse().find((b) => !b.isFuture) ?? null;

  return { bars, yMax, yTicks, xTicks, today: lastKnown };
}

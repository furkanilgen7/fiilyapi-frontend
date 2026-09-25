/**
 * PLN-F3.2b · S-eğrisi (kümülatif ilerleme) SAF geometrisi.
 *
 * Kaynak: mockup `Planlama - Panel.dc.html:197-222` (viewBox 760×256).
 * F3-SOZLESME.md §0: backend `s_curve: CurvePoint[]` GÜNLÜK kümülatif
 * planlı/gerçek yüzdeyi ZATEN hesaplar (`planned_pct_cum`/`progress_pct_cum`)
 * — bu dosya YALNIZ ölçekler, YENİDEN HESAPLAMAZ.
 *
 * "Gerçek" çizgisi yalnız `is_future === false` günlerde çizilir (gelecek
 * günün gerçeği YOKTUR — mockup'ın "Bugün"den sonrasını çizmemesiyle AYNI).
 */
import type { EvPanelReport } from "@/lib/api/models";

import { fillSplit, indexScale, tickIndices, valueScale } from "./scale";

export const S_VIEW_W = 760;
export const S_VIEW_H = 256;
export const S_LEFT = 44;
export const S_RIGHT = 744;
export const S_TOP = 14;
export const S_BASE = 224;
const Y_MIN = 0;
const Y_MAX = 100;
const MAX_X_TICKS = 8;
const Y_TICK_COUNT = 5;

type CurvePoint = EvPanelReport["s_curve"][number];

export interface SCurvePoint {
  index: number;
  day: string;
  x: number;
  plannedY: number;
  actualY: number | null;
}

export interface SCurveGeometry {
  points: SCurvePoint[];
  plannedPath: string;
  actualPath: string;
  /** İLERİDE (gerçek ≥ planlı) dolgusu — mockup'ın "Önde" yeşil alanı. */
  fillAhead: string;
  /** GERİDE (gerçek < planlı) dolgusu — mockup'ın "Gecikme" kırmızı alanı. */
  fillBehind: string;
  /** Son GERÇEK (gelecek olmayan) gün — "Bugün" çizgisi ve ipucu buradan okunur. */
  today: SCurvePoint | null;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
}

function num(v: string | null): number {
  return v === null ? 0 : Number(v);
}

export function sCurveGeometry(
  points: readonly CurvePoint[],
  labelForDay: (day: string) => string,
): SCurveGeometry {
  const n = points.length;
  if (n === 0) {
    return { points: [], plannedPath: "", actualPath: "", fillAhead: "", fillBehind: "", today: null, yTicks: [], xTicks: [] };
  }

  const xs = points.map((_, i) => indexScale(i, n, S_LEFT, S_RIGHT));
  const plannedPct = points.map((p) => num(p.planned_pct_cum));
  const actualPct = points.map((p) => (p.is_future ? null : num(p.progress_pct_cum)));

  const scaled: SCurvePoint[] = points.map((p, i) => ({
    index: i,
    day: p.day,
    x: xs[i]!,
    plannedY: valueScale(plannedPct[i]!, Y_MIN, Y_MAX, S_TOP, S_BASE),
    actualY: actualPct[i] === null ? null : valueScale(actualPct[i]!, Y_MIN, Y_MAX, S_TOP, S_BASE),
  }));

  const plannedPath = scaled.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.plannedY}`).join("");

  const actualIndices = scaled.filter((p) => p.actualY !== null);
  const actualPath = actualIndices.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.actualY}`).join("");

  const { ahead: fillAhead, behind: fillBehind } = fillSplit(
    actualIndices.map((p) => p.x),
    actualIndices.map((p) => p.actualY ?? 0),
    actualIndices.map((p) => p.plannedY),
  );

  const today = actualIndices.length > 0 ? actualIndices[actualIndices.length - 1]! : null;

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = Y_MIN + ((Y_MAX - Y_MIN) * i) / (Y_TICK_COUNT - 1);
    return { y: valueScale(value, Y_MIN, Y_MAX, S_TOP, S_BASE), label: `%${Math.round(value)}` };
  });

  const xTicks = tickIndices(n, MAX_X_TICKS).map((i) => ({ x: xs[i]!, label: labelForDay(points[i]!.day) }));

  return { points: scaled, plannedPath, actualPath, fillAhead, fillBehind, today, yTicks, xTicks };
}

import type { EvDailyReport } from "@/lib/api/models";

/**
 * PLN-F3.4 · GİR "2 · 7 günlük trend" mini çizgi grafiği — GİR:214-227 (ekran
 * SVG `viewBox 0 0 420 160`), plan §3 "GİR 7 günlük mini çizgi". Mockup'ta Y
 * ekseni SABİTTİR (%42–50); plan bunu bayat işaretler → burada OTOMATİK
 * ölçek: görünür noktaların (gelecek HARİÇ) min/maks kümülatif yüzdesinden,
 * biraz payla (K27 sapma toleransına benzer sabit değil — SAF görsel pay).
 *
 * SAF fonksiyon: koordinatlar `Math.round` ile tamsayıya yuvarlanır (görsel
 * kapı kuralı — F3-SÖZLEŞME §3 madde: "Math.round koordinat").
 */
const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 160;
const LEFT_PAD = 34;
const RIGHT_PAD = 10;
const TOP_PAD = 10;
const BOTTOM_PAD = 24;
const AXIS_PAD_FRACTION = 0.1;

export interface TrendChartPoint {
  x: number;
  y: number;
  isDraft: boolean;
}

export interface TrendChart {
  plannedPath: string;
  actualPath: string;
  points: readonly TrendChartPoint[];
}

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export function buildTrendChart(trend: EvDailyReport["trend"]): TrendChart | null {
  const visible = trend.filter((t) => !t.is_future);
  if (visible.length === 0) return null;

  const values: number[] = [];
  for (const t of visible) {
    const p = numberOrNull(t.planned_pct_cum);
    const a = numberOrNull(t.progress_pct_cum);
    if (p !== null) values.push(p);
    if (a !== null) values.push(a);
  }
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const rawMax = Math.max(...values);
  const max = rawMax === min ? min + 0.01 : rawMax;
  const span = max - min;
  const pad = span * AXIS_PAD_FRACTION || 0.01;
  const yMin = min - pad;
  const yMax = max + pad;

  const plotWidth = VIEW_WIDTH - LEFT_PAD - RIGHT_PAD;
  const plotHeight = VIEW_HEIGHT - TOP_PAD - BOTTOM_PAD;
  const stepX = visible.length > 1 ? plotWidth / (visible.length - 1) : 0;

  const x = (index: number) => Math.round(LEFT_PAD + index * stepX);
  const y = (value: number) => Math.round(TOP_PAD + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight);

  let plannedPath = "";
  let actualPath = "";
  const points: TrendChartPoint[] = [];

  visible.forEach((t, index) => {
    const p = numberOrNull(t.planned_pct_cum);
    const a = numberOrNull(t.progress_pct_cum);
    if (p !== null) plannedPath += `${plannedPath === "" ? "M" : "L"}${x(index)} ${y(p)} `;
    if (a !== null) {
      actualPath += `${actualPath === "" ? "M" : "L"}${x(index)} ${y(a)} `;
      points.push({ x: x(index), y: y(a), isDraft: t.is_draft });
    }
  });

  return { plannedPath: plannedPath.trim(), actualPath: actualPath.trim(), points };
}

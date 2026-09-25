import type { EvPreviewOut } from "@/lib/api/models";

import { dayNumber, isoFromDayNumber } from "./gantt-geometry";

/**
 * PLN-F1.6 · Adım 3 grafiklerinin SAF geometrisi — Adam-Saat Bütçesi.dc.html
 * :342-382 (viewBox ölçüleri) ve :699-734 `preview()`. Eğri verisi backend
 * önizleme ucundan gelir (kalıcı değil); burada yalnız ölçeklenir.
 * Koordinatlar `Math.round` (görsel spec 4. parça).
 */

// S-eğrisi · viewBox 760×250 (BÜT:342-347, :712).
export const S_VIEW_W = 760;
export const S_VIEW_H = 250;
export const S_LEFT = 44;
export const S_RIGHT = 744;
export const S_TOP = 14;
export const S_BASE = 224;
/** Uzun aralıkta yol noktası tavanı (BÜT:713 `step = 3` karşılığı, orana bağlı). */
const MAX_PATH_POINTS = 240;

// Histogram · viewBox 460×250 (BÜT:367-375, :728).
export const H_VIEW_W = 460;
export const H_VIEW_H = 250;
export const H_LEFT = 34;
export const H_RIGHT = 450;
export const H_BASE = 214;
const H_HEIGHT = 196;
const H_MIN_MAX = 60;
const H_BAR_INSET = 0.15;
const H_BAR_RATIO = 0.7;
const H_TICK_EVERY = 6;
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type Series = EvPreviewOut["total"];

export interface SCurveGeometry {
  days: string[];
  areas: { key: string; color: string; name: string; d: string }[];
  totalLine: string;
  /** Yığın tepesi (% 0–100), gün başına. */
  totalPct: number[];
  totalBudget: number;
  ticks: { x: number; label: string }[];
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = dayNumber(start); d <= dayNumber(end); d += 1) out.push(isoFromDayNumber(d));
  return out;
}

/** Seyrek seri → gün başına kümülatif a-s (son değer ileri taşınır). */
function cumulativeOn(series: Series, days: readonly string[]): number[] {
  const byDay = new Map(series.days.map((d) => [d.day, Number(d.cumulative_mhr)] as const));
  let last = 0;
  return days.map((day) => {
    last = byDay.get(day) ?? last;
    return last;
  });
}

const xS = (i: number, n: number) => Math.round(S_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * (S_RIGHT - S_LEFT)));
const yS = (pct: number) => Math.round(S_BASE - (pct / 100) * (S_BASE - S_TOP));

function sampleIndices(n: number): number[] {
  const step = Math.max(1, Math.ceil(n / MAX_PATH_POINTS));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

function linePath(values: readonly number[], indices: readonly number[]): string {
  return indices.map((i, k) => `${k === 0 ? "M" : "L"}${xS(i, values.length)} ${yS(values[i])}`).join("");
}

function areaPath(top: readonly number[], base: readonly number[], indices: readonly number[]): string {
  const up = linePath(top, indices);
  const down = [...indices].reverse().map((i) => `L${xS(i, base.length)} ${yS(base[i])}`).join("");
  return `${up}${down}Z`;
}

function monthTicks(days: readonly string[]) {
  const ticks: { x: number; label: string }[] = [];
  const startYear = days[0]?.slice(0, 4);
  days.forEach((day, i) => {
    if (!day.endsWith("-01")) return;
    const year = day.slice(0, 4);
    ticks.push({ x: xS(i, days.length), label: `${MONTHS[Number(day.slice(5, 7)) - 1]}${year !== startYear ? ` ${year.slice(2)}` : ""}` });
  });
  return ticks;
}

export function sCurveGeometry(preview: EvPreviewOut): SCurveGeometry {
  const total = Number(preview.total.budget_mhr);
  if (!preview.start || !preview.end || !(total > 0)) {
    return { days: [], areas: [], totalLine: "", totalPct: [], totalBudget: 0, ticks: [] };
  }
  const days = daysBetween(preview.start, preview.end);
  const indices = sampleIndices(days.length);
  let base = days.map(() => 0);
  const areas = preview.disciplines.map((d) => {
    const top = cumulativeOn(d.series, days).map((v, i) => base[i] + (v / total) * 100);
    const area = { key: d.discipline_node_id, color: d.color ?? "", name: d.name ?? "Disiplinsiz", d: areaPath(top, base, indices) };
    base = top;
    return area;
  });
  return { days, areas, totalLine: linePath(base, indices), totalPct: base, totalBudget: total, ticks: monthTicks(days) };
}

/** Tooltip noktası: gün dizinindeki yığın tepesi. */
export function sCurvePoint(geo: SCurveGeometry, index: number) {
  const i = Math.min(Math.max(0, index), geo.days.length - 1);
  const pct = geo.totalPct[i] ?? 0;
  return { index: i, day: geo.days[i], x: xS(i, geo.days.length), y: yS(pct), pct, mhr: (pct / 100) * geo.totalBudget };
}

/** Fare x'inden (viewBox birimi) en yakın gün dizini. */
export function sCurveIndexAt(geo: SCurveGeometry, viewX: number): number {
  const n = geo.days.length;
  if (n <= 1) return 0;
  return Math.round(((viewX - S_LEFT) / (S_RIGHT - S_LEFT)) * (n - 1));
}

export interface HistogramGeometry {
  bars: { x: number; y: number; w: number; h: number; week: number }[];
  line: string;
  yMax: number;
  yTicks: { y: number; value: number }[];
  ticks: { x: number; label: string }[];
  peakIndex: number | null;
}

export function histogramGeometry(preview: EvPreviewOut): HistogramGeometry {
  const weeks = preview.total.weeks;
  const n = Math.max(1, weeks.length);
  const slot = (H_RIGHT - H_LEFT) / n;
  const values = weeks.map((w) => Math.max(Number(w.required_people ?? 0), w.planned_people ?? 0));
  const yMax = Math.max(H_MIN_MAX, Math.ceil(Math.max(0, ...values) / 10) * 10);
  const yH = (v: number) => Math.round(H_BASE - (v / yMax) * H_HEIGHT);
  const bars = weeks.map((w, i) => {
    const y = yH(Number(w.required_people ?? 0));
    return { x: Math.round(H_LEFT + i * slot + slot * H_BAR_INSET), y, w: Math.max(1, Math.round(slot * H_BAR_RATIO)), h: H_BASE - y, week: w.week_no };
  });
  const line = weeks
    .map((w, i) => (w.planned_people === null ? "" : `${i === 0 ? "M" : "L"}${Math.round(H_LEFT + i * slot)} ${yH(w.planned_people)}H${Math.round(H_LEFT + (i + 1) * slot)}`))
    .join("");
  const peak = preview.total.peak_week;
  const peakIndex = peak ? weeks.findIndex((w) => w.week_no === peak.week_no) : -1;
  return {
    bars,
    line: line.startsWith("L") ? `M${line.slice(1)}` : line,
    yMax,
    yTicks: [0, 1, 2, 3, 4].map((k) => ({ value: (yMax * k) / 4, y: yH((yMax * k) / 4) })),
    ticks: weeks.filter((_, i) => i % H_TICK_EVERY === 0).map((w) => ({ x: Math.round(H_LEFT + (weeks.indexOf(w) + 0.5) * slot), label: `H${w.week_no}` })),
    peakIndex: peakIndex >= 0 ? peakIndex : null,
  };
}

/**
 * CEO n — fare grafikte değilken DURAĞAN ipucu (BÜT:351-356): S-eğrisinde
 * bugünün noktası; bugün önizleme aralığı dışındaysa ipucu yok.
 */
export function defaultSCurveIndex(geo: SCurveGeometry, todayIso: string): number | null {
  const index = geo.days.indexOf(todayIso);
  return index >= 0 ? index : null;
}

/** CEO n — histogramda tepe hafta (BÜT:376-381); bütçe 0 → tepe yok → ipucu yok. */
export function defaultHistogramIndex(geo: HistogramGeometry): number | null {
  return geo.peakIndex;
}

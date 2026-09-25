/**
 * PLN-F3.2b · Günlük kazanılmış/harcanan ÇİFT ÇUBUK grafiğinin SAF geometrisi.
 *
 * Kaynak: mockup `Planlama - Panel.dc.html:271-287` (viewBox 460×196).
 * F3-SOZLESME.md §0: backend `bars: BarPoint[]` günlük `earned_day`/
 * `spent_day`i ZATEN hesaplar — bu dosya YALNIZ ölçekler.
 *
 * "Gönderilmedi" noktası (mockup `db.un`): `diary_status ∈ {none, draft}` VE
 * `is_holiday === false` olan iş günleri — tatil günü zaten boş kolon
 * (tarama deseni) basar, ayrıca nokta basmaz.
 */
import type { EvPanelReport } from "@/lib/api/models";
import { compareDecimalStrings } from "@/lib/earned-value";

import { bandScale, bandWidth, niceAxisMax, tickIndices, valueScale } from "./scale";

export const D_VIEW_W = 460;
export const D_VIEW_H = 196;
export const D_LEFT = 36;
export const D_RIGHT = 450;
export const D_TOP = 12;
export const D_BASE = 160;
const D_MIN_MAX = 40;
const BAR_INSET = 0.1;
const BAR_RATIO = 0.36;
const MAX_X_TICKS = 6;
const Y_TICK_COUNT = 5;

type BarPoint = EvPanelReport["bars"][number];

export interface DailyBar {
  day: string;
  x: number;
  earnedPath: string;
  spentPath: string;
  isHoliday: boolean;
  /** `diary_status ∈ {none, draft}` VE tatil değil. */
  isUnsent: boolean;
}

export interface DailyBarsGeometry {
  bars: DailyBar[];
  /** Tatil kolonlarının birleşik dolgu yolu (`<pattern>` ile taranır). */
  holidayPath: string;
  unsentDots: { x: number; day: string }[];
  yMax: number;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  today: DailyBar | null;
}

/** Yalnız SVG ölçeğine (yükseklik/koordinat) beslemek için — KARŞILAŞTIRMA burada YAPILMAZ. */
function num(v: string | null): number {
  return v === null ? 0 : Number(v);
}

/** Ondalık dizeyi biçim/karşılaştırma kanonuyla (`compareDecimalStrings`) sıfırla kıyaslar. */
function isPositive(v: string | null): boolean {
  return v !== null && compareDecimalStrings(v, "0") > 0;
}

function barPath(x: number, width: number, raw: string | null, yMax: number): string {
  if (!isPositive(raw)) return "";
  const top = valueScale(num(raw), 0, yMax, D_TOP, D_BASE);
  const height = D_BASE - top;
  return `M${x} ${D_BASE}v-${height}h${width}v${height}z`;
}

export function dailyBarsGeometry(points: readonly BarPoint[], labelForDay: (day: string) => string): DailyBarsGeometry {
  const n = points.length;
  if (n === 0) {
    return { bars: [], holidayPath: "", unsentDots: [], yMax: D_MIN_MAX, yTicks: [], xTicks: [], today: null };
  }

  const values = points.flatMap((p) => [num(p.earned_day), num(p.spent_day)]);
  // LİDER TALEBİ (P1) — "çirkin" ceil/10*10 KALDIRILDI, ortak `niceAxisMax`
  // (charts/scale.ts) 1-2-2,5-5 × 10^n merdiveniyle yuvarlar.
  const yMax = niceAxisMax(Math.max(0, ...values), Y_TICK_COUNT, D_MIN_MAX);
  const slot = bandWidth(n, D_LEFT, D_RIGHT);
  const barWidth = Math.round(Math.max(1, slot * BAR_RATIO));

  let holidayPath = "";
  const unsentDots: { x: number; day: string }[] = [];
  const bars: DailyBar[] = points.map((p, i) => {
    const left = bandScale(i, n, D_LEFT, D_RIGHT);
    const isUnsent = !p.is_holiday && (p.diary_status === "none" || p.diary_status === "draft");
    if (p.is_holiday) {
      holidayPath += `M${Math.round(left + 1)} ${D_TOP}h${Math.round(slot - 2)}v${D_BASE - D_TOP}h-${Math.round(slot - 2)}z`;
    }
    if (isUnsent) {
      unsentDots.push({ x: Math.round(left + slot / 2), day: p.day });
    }
    const earnedX = Math.round(left + slot * BAR_INSET);
    const spentX = Math.round(earnedX + barWidth + 1);
    return {
      day: p.day,
      x: earnedX,
      earnedPath: p.is_holiday ? "" : barPath(earnedX, barWidth, p.earned_day, yMax),
      spentPath: p.is_holiday ? "" : barPath(spentX, barWidth, p.spent_day, yMax),
      isHoliday: p.is_holiday,
      isUnsent,
    };
  });

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = (yMax * i) / (Y_TICK_COUNT - 1);
    return { y: valueScale(value, 0, yMax, D_TOP, D_BASE), label: String(Math.round(value)) };
  }).reverse();

  const xTicks = tickIndices(n, MAX_X_TICKS).map((i) => ({
    x: Math.round(bandScale(i, n, D_LEFT, D_RIGHT) + slot / 2),
    label: labelForDay(points[i]!.day),
  }));

  const lastWorking = [...bars].reverse().find((b) => !b.isHoliday) ?? null;

  return { bars, holidayPath, unsentDots, yMax, yTicks, xTicks, today: lastWorking };
}

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
/** Mockup Panel.dc.html:537 `Math.floor(v/5)*5` / `Math.ceil(v/5)*5`. */
const Y_AXIS_ROUND_STEP = 5;

type CurvePoint = EvPanelReport["s_curve"][number];

/**
 * S32 (KULLANICI, 2026-09-26) — araç çubuğundaki `?aralik=` değerleriyle
 * AYNI kümedir (`PanelRange`, `lib/api/hooks/useEvReports.ts`); burada
 * yeniden tanımlanır (charts/ SAF katmanı `lib/api/hooks`u İTHAL ETMEZ —
 * `core-planning-import-guard`in koruduğu katman ayrımıyla AYNI gerekçe).
 */
export type SCurveScaleRange = "4w" | "3m" | "all";

/**
 * Mockup Panel.dc.html:537-539 — `range !== 'all'` iken Y ekseni pencere
 * sınırlarına (ilk/son nokta) göre DARALIR, 'all'da SABİT 0–100 kalır
 * (mockup'ın kendi özel durumu). SAF fonksiyon: yalnız `points` dizisinin
 * İLK ve SON elemanına bakar (backend zaten seçili aralığa göre pencereler
 * — F3-SOZLESME §0, "istemci filtrelemez"), yeniden hesaplama YAPMAZ.
 * `planned_pct_cum` sınır noktalarında `null` ise (veri yok) SABİT eksene
 * DÜŞER — dinamik daralma "veri var" varsayar, uydurma sınır ÇİZMEZ.
 */
function computeYAxis(points: readonly CurvePoint[], range: SCurveScaleRange): { min: number; max: number } {
  if (range === "all" || points.length === 0) return { min: Y_MIN, max: Y_MAX };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first.planned_pct_cum === null || last.planned_pct_cum === null) return { min: Y_MIN, max: Y_MAX };
  const firstPlanned = Number(first.planned_pct_cum) * 100;
  const firstActual = first.progress_pct_cum === null ? firstPlanned : Number(first.progress_pct_cum) * 100;
  const lastPlanned = Number(last.planned_pct_cum) * 100;
  const min = Math.max(Y_MIN, Math.floor(Math.min(firstPlanned, firstActual) / Y_AXIS_ROUND_STEP) * Y_AXIS_ROUND_STEP);
  const max = Math.min(Y_MAX, Math.ceil(lastPlanned / Y_AXIS_ROUND_STEP) * Y_AXIS_ROUND_STEP);
  return { min, max };
}

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

/**
 * 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU (yan yana ölçümde bulundu): `s_curve`
 * alanları (`planned_pct_cum`/`progress_pct_cum`) proje çapındaki 0–1 KESİR
 * kuralını izler (KPI/tablo alanlarıyla AYNI — `formatPercent01`/`toPoints`
 * bu değerleri ZATEN ×100 çevirir), ama Y ekseni burada 0–100 YÜZDE birimi
 * (`Y_MAX=100`, `yTicks` "%0".."%100" basar). `Number(v)` dönüşüm YAPMADAN
 * doğrudan eksene besleniyordu — "%45,9" bir kesir olarak (0,459) neredeyse
 * SIFIR yüksekliğe denk geliyordu, eğri DÜZ ÇİZİLİYORDU. `×100` eklendi.
 */
function num(v: string | null): number {
  return v === null ? 0 : Number(v) * 100;
}

export function sCurveGeometry(
  points: readonly CurvePoint[],
  labelForDay: (day: string) => string,
  range: SCurveScaleRange = "all",
): SCurveGeometry {
  const n = points.length;
  if (n === 0) {
    return { points: [], plannedPath: "", actualPath: "", fillAhead: "", fillBehind: "", today: null, yTicks: [], xTicks: [] };
  }

  const { min: yMin, max: yMax } = computeYAxis(points, range);

  const xs = points.map((_, i) => indexScale(i, n, S_LEFT, S_RIGHT));
  const plannedPct = points.map((p) => num(p.planned_pct_cum));
  // 🔴 `num()` null'ı 0'a ÇEVİRİR (SVG'ye 0 değer beslemek içindir) — burada
  // "veri YOK" (null) ile "gerçek %0" AYRI anlamlar taşır, o yüzden `num()`
  // KULLANILMAZ: gelecek gün YA DA veri yok → null (nokta/çizgi BASILMAZ).
  const actualPct = points.map((p) => (p.is_future || p.progress_pct_cum === null ? null : Number(p.progress_pct_cum) * 100));

  const scaled: SCurvePoint[] = points.map((p, i) => ({
    index: i,
    day: p.day,
    x: xs[i]!,
    plannedY: valueScale(plannedPct[i]!, yMin, yMax, S_TOP, S_BASE),
    actualY: actualPct[i] === null ? null : valueScale(actualPct[i]!, yMin, yMax, S_TOP, S_BASE),
  }));

  const plannedPath = scaled.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.plannedY}`).join("");

  const actualIndices = scaled.filter((p) => p.actualY !== null);
  const actualPath = actualIndices.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.actualY}`).join("");

  const { ahead: fillAhead, behind: fillBehind } = fillSplit(
    actualIndices.map((p) => p.x),
    actualIndices.map((p) => p.actualY ?? 0),
    actualIndices.map((p) => p.plannedY),
  );

  // "Bugün" son `is_future === false` günüdür — actualY'nin DOLU olmasına
  // BAĞLI DEĞİL (lider netliği, F3.3 (b) hâli "baseline var, sahadan veri
  // yok": her gün is_future=false ama HİÇBİRİNİN gerçek verisi yok; "Bugün"
  // çizgisi yine de son takvim gününü göstermelidir).
  let todayIndex: number | null = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (!points[i]!.is_future) {
      todayIndex = i;
      break;
    }
  }
  const today = todayIndex === null ? null : scaled[todayIndex]!;

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, i) => {
    const value = yMin + ((yMax - yMin) * i) / (Y_TICK_COUNT - 1);
    return { y: valueScale(value, yMin, yMax, S_TOP, S_BASE), label: `%${Math.round(value)}` };
  });

  const xTicks = tickIndices(n, MAX_X_TICKS).map((i) => ({ x: xs[i]!, label: labelForDay(points[i]!.day) }));

  return { points: scaled, plannedPath, actualPath, fillAhead, fillBehind, today, yTicks, xTicks };
}

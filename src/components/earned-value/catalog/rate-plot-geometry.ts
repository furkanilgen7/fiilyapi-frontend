/**
 * PLN-F1.5 · Katalog satırı "Dağılım" min–max nokta grafiğinin SAF geometrisi.
 *
 * Kaynak: `Planlama - Birim Oran Kataloğu.dc.html:453-463` (`plot()`) ve
 * çizim :201-214 — viewBox 340×110, eksen y=62, çizim aralığı x 14…326.
 * Ölçek: tamamlanan şantiye oranları + standart; iki yana aralığın %25'i pay
 * (aralık 0 ise standardın %10'u). "Devam eden" nokta çizilmez: K4 gereği
 * ortalamaya yalnız tamamlanmış şantiye girer ve API devam edeni taşımaz.
 *
 * 🔴 Görsel kapı kuralı (`treasury/cash-flow-geometry.ts`): çıkan HER
 * koordinat `Math.round`lanır — kesirli piksel turdan tura farklı yuvarlanır.
 */

export const PLOT_WIDTH = 340;
export const PLOT_HEIGHT = 110;
/** KAT:456 — çizim aralığının sol kenarı ve genişliği (14 + 312 = 326). */
const PLOT_LEFT = 14;
const PLOT_SPAN = 312;
/** KAT:202 — yatay eksen. */
export const PLOT_AXIS_Y = 62;
/** KAT:457 — çakışmasın diye ardışık noktalar ±9 birim kaydırılır. */
const POINT_STAGGER = 9;
/** KAT:455 — ölçek payı: aralığın %25'i; aralık 0 ise standardın %10'u. */
const RANGE_PAD_RATIO = 0.25;
const FLAT_PAD_RATIO = 0.1;
/** Standart da 0 ise sıfıra bölmemek için son çare pay. */
const FALLBACK_PAD = 1;
/** KAT:462 — min = max iken zeminin en küçük genişliği. */
const MIN_BAND_WIDTH = 2;
/** KAT:459 — 0..4 → beş etiket. */
const TICK_STEPS = 4;

export interface RatePlotInput {
  standard: number;
  /** Tamamlanan şantiye oranları (API sırası). */
  rates: readonly number[];
  average: number | null;
  min: number | null;
  max: number | null;
}

export interface RatePlotPoint {
  index: number;
  x: number;
  y: number;
}

export interface RatePlotTick {
  x: number;
  /** Ham değer — etiket biçimi çağıranda (`formatUnitRate`). */
  value: number;
}

export interface RatePlotGeometry {
  standardX: number;
  averageX: number | null;
  band: { x: number; width: number } | null;
  points: RatePlotPoint[];
  ticks: RatePlotTick[];
}

function scaleDomain(values: readonly number[], standard: number): { lo: number; hi: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * RANGE_PAD_RATIO || Math.abs(standard) * FLAT_PAD_RATIO || FALLBACK_PAD;
  return { lo: lo - pad, hi: hi + pad };
}

export function ratePlotGeometry(input: RatePlotInput): RatePlotGeometry {
  const { standard, rates, average, min, max } = input;
  const { lo, hi } = scaleDomain([...rates, standard], standard);
  const x = (value: number) => Math.round(PLOT_LEFT + ((value - lo) / (hi - lo)) * PLOT_SPAN);

  const points = rates.map((rate, index) => ({
    index,
    x: x(rate),
    // KAT:457 — ilk nokta eksende, sonrakiler sırayla aşağı (+9) / yukarı (−9).
    y: PLOT_AXIS_Y + (index === 0 ? 0 : index % 2 === 1 ? POINT_STAGGER : -POINT_STAGGER),
  }));

  const ticks = Array.from({ length: TICK_STEPS + 1 }, (_, step) => {
    const value = lo + ((hi - lo) * step) / TICK_STEPS;
    return { x: x(value), value };
  });

  const band =
    min !== null && max !== null
      ? { x: x(min), width: Math.max(MIN_BAND_WIDTH, x(max) - x(min)) }
      : null;

  return {
    standardX: x(standard),
    averageX: average === null ? null : x(average),
    band,
    points,
    ticks,
  };
}

/** KAT:460 — ipucunun varsayılan noktası: en yüksek oran ("en yüksek"). */
export function maxRateIndex(rates: readonly number[]): number | null {
  if (rates.length === 0) return null;
  return rates.reduce((best, rate, index) => (rate > rates[best] ? index : best), 0);
}

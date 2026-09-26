/**
 * PLN-F3.2b · PF trendi grafiğinin SAF geometrisi (S14).
 *
 * Kaynak: mockup `Planlama - Panel.dc.html:299-318` (viewBox 460×196).
 * Backend `pf_trend: PfPoint[]` GÜNLÜK PF'yi (`pf_day`)
 * VE 7 günlük ortalamayı (`pf_rolling`) ZATEN hesaplar — istemci YENİDEN
 * TÜRETMEZ, yalnız ölçekler.
 *
 * S14: zemin bandı GÜNLÜK eşiklerden (`pf_bands.daily`, `DailyPfThresholds`)
 * kurulur — haftalık/kümülatif eşiklerden DEĞİL (mockup'ın 0,95/1,00 sabiti
 * de günlük bant varsayılanıyla AYNIdır). Y ekseni 0,80–1,20 KIRPILIR.
 */
import type { EvPanelReport } from "@/lib/api/models";
import { formatPf, type DailyPfThresholds } from "@/lib/earned-value";

import { tickIndices, valueScale, indexScale } from "./scale";

export const PF_VIEW_W = 460;
export const PF_VIEW_H = 196;
export const PF_LEFT = 36;
export const PF_RIGHT = 450;
export const PF_TOP = 12;
export const PF_BASE = 160;
export const PF_Y_MIN = 0.8;
export const PF_Y_MAX = 1.2;
const MAX_X_TICKS = 4;

type PfPoint = EvPanelReport["pf_trend"][number];

export interface PfBandZone {
  color: "red" | "amber" | "green";
  y: number;
  height: number;
}

export interface PfTrendPoint {
  day: string;
  x: number;
  y: number | null;
}

export interface PfTrendGeometry {
  points: PfTrendPoint[];
  rollingPath: string;
  bandZones: PfBandZone[];
  yTicks: { y: number; label: string }[];
  /**
   * LİDER DENETİMİ KUSURU (P2, 2026-09-26) — sağdaki SON tık `PF_RIGHT`e
   * (viewBox kenarına) oturur; `text-anchor="middle"` metnin YARISINI
   * viewBox DIŞINA taşırıp KIRPTIRIYORDU ("28.09" → "28.0" görünüyordu).
   * Yalnız SON tık `"end"` hizalanır (metin sola doğru büyür, kırpılmaz).
   */
  xTicks: { x: number; label: string; align: "middle" | "end" }[];
  today: { index: number; day: string; x: number; y: number | null; rolling: number | null } | null;
}

function num(v: string | null): number | null {
  return v === null ? null : Number(v);
}

function y(value: number): number {
  return valueScale(value, PF_Y_MIN, PF_Y_MAX, PF_TOP, PF_BASE);
}

export function pfBandZones(thresholds: DailyPfThresholds): PfBandZone[] {
  const redBelow = Number(thresholds.redBelow);
  const greenFrom = Number(thresholds.greenFrom);
  const greenTop = y(PF_Y_MAX);
  const greenBottom = y(greenFrom);
  const amberBottom = y(redBelow);
  const redBottom = y(PF_Y_MIN);
  const zones: PfBandZone[] = [
    { color: "green", y: greenTop, height: greenBottom - greenTop },
    { color: "amber", y: greenBottom, height: amberBottom - greenBottom },
    { color: "red", y: amberBottom, height: redBottom - amberBottom },
  ];
  return zones.filter((zone) => zone.height > 0);
}

/**
 * LİDER DENETİMİ KUSURU (P2, 2026-09-26) — `PfPoint` şemasında `is_future`
 * YOK (yalnız `day`/`pf_day`/`pf_rolling`); "Bugün" ÖNCEDEN dizinin SON
 * elemanıydı — fikstür/backend `pf_trend`e GELECEK günleri de eklerse
 * (S-eğrisi/GİR ile AYNI pencere) ipucu yanlış günü "Bugün" diye basıyor,
 * nokta da gelecek güne ÇİZİLİYORDU. `reportDay` (`report.day`, ISO)
 * karşılaştırma ÇAPASI: `day > reportDay` → GELECEK, ne nokta ne de "Bugün"
 * o günü GÖSTERİR. ISO `YYYY-MM-DD` sözlüksel karşılaştırma TARİH sırasıyla
 * AYNIDIR (`Date` ARİTMETİĞİ YOK — ürün kodu tarih envanteri kuralı).
 */
export function pfTrendGeometry(
  points: readonly PfPoint[],
  thresholds: DailyPfThresholds,
  labelForDay: (day: string) => string,
  reportDay: string,
): PfTrendGeometry {
  const n = points.length;
  if (n === 0) {
    return { points: [], rollingPath: "", bandZones: pfBandZones(thresholds), yTicks: [], xTicks: [], today: null };
  }

  const xs = points.map((_, i) => indexScale(i, n, PF_LEFT, PF_RIGHT));
  const isFuture = (day: string) => day > reportDay;
  const scaled: PfTrendPoint[] = points.map((p, i) => {
    const v = num(p.pf_day);
    return { day: p.day, x: xs[i]!, y: v === null || isFuture(p.day) ? null : y(v) };
  });

  const rollingKnown = points
    .map((p, i) => ({ x: xs[i]!, v: isFuture(p.day) ? null : num(p.pf_rolling) }))
    .filter((p): p is { x: number; v: number } => p.v !== null);
  const rollingPath = rollingKnown.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${y(p.v)}`).join("");

  const yTicks = [
    { value: PF_Y_MAX, label: "1,20" },
    { value: 1.0, label: "1,00" },
    { value: Number(thresholds.redBelow), label: formatPf(thresholds.redBelow) },
    { value: PF_Y_MIN, label: "0,80" },
  ].map((t) => ({ y: y(t.value), label: t.label }));

  const xTickIndices = tickIndices(n, MAX_X_TICKS);
  const lastTickIndex = xTickIndices[xTickIndices.length - 1];
  const xTicks = xTickIndices.map((i) => ({
    x: xs[i]!,
    label: labelForDay(points[i]!.day),
    align: (i === lastTickIndex ? "end" : "middle") as "middle" | "end",
  }));

  // "Bugün" = rapor günü — dizideki SON GELECEK-OLMAYAN nokta (dizi
  // GELECEĞE uzanıyorsa bile, ÖNCEKİ kusurun tersi: dizinin SON elemanı
  // DEĞİL).
  let todayIndex: number | null = null;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (!isFuture(points[i]!.day)) {
      todayIndex = i;
      break;
    }
  }
  const today =
    todayIndex === null
      ? null
      : {
          index: todayIndex,
          day: points[todayIndex]!.day,
          x: xs[todayIndex]!,
          y: scaled[todayIndex]!.y,
          rolling: num(points[todayIndex]!.pf_rolling),
        };

  return { points: scaled, rollingPath, bandZones: pfBandZones(thresholds), yTicks, xTicks, today };
}

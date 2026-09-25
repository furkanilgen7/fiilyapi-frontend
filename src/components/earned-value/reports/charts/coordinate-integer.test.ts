import { describe, it, expect } from "vitest";

import { bandScale, fillSplit, indexScale, tickIndices, valueScale } from "./scale";
import { sCurveGeometry } from "./s-curve-geometry";
import { dailyBarsGeometry } from "./daily-bars-geometry";
import { pfTrendGeometry } from "./pf-trend-geometry";
import { histogramGeometry } from "./histogram-geometry";
import type { EvPanelReport } from "@/lib/api/models";
import type { DailyPfThresholds } from "@/lib/earned-value";

/**
 * PLN-F3.2b-ek (lider denetimi) · "Koordinat TAM PİKSEL" bekçisi.
 *
 * Görsel kapı kuralı (`budget/preview-geometry.ts` üstündeki not, F-SUBPX
 * dersi): kesirli piksel turdan tura FARKLI yuvarlanıp baseline'ı oynatır.
 * Önceki turda `Math.round` çağrıları YAZILDI ama HİÇBİR TEST bunu
 * BEKÇİLEMİYORDU — `valueScale`den `Math.round`u kaldıran bir mutasyon
 * 45 grafik testinin hepsini YEŞİL bıraktı (lider ölçümü).
 *
 * Bu dosya SVG `d` yollarındaki VE sayısal alanlardaki (x/y/width/height)
 * HER sayıyı ayıklayıp `Number.isInteger` doğrular — kesir ÜRETMESİ BEKLENEN
 * (bölme sonucu tam sayıya denk gelmeyen) girdilerle.
 */

/** SVG path'i / metin içindeki tüm sayıları (ondalık, negatif dahil) ayıklar. */
function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d+\.?\d*/g);
  return matches ? matches.map(Number) : [];
}

function expectAllIntegers(label: string, numbers: readonly number[]): void {
  const fractional = numbers.filter((n) => !Number.isInteger(n));
  expect(fractional, `${label}: kesirli koordinat bulundu: ${fractional.join(", ")}`).toEqual([]);
}

describe("scale.ts — tam piksel", () => {
  it("indexScale/bandScale/valueScale/fillSplit kesir üretmez", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7].map((i) => indexScale(i, 7, 44, 745)); // 745-44=701, 7 asal değil ama bölüm kesirli
    expectAllIntegers("indexScale", xs);
    const bands = [0, 1, 2].map((i) => bandScale(i, 3, 36, 451)); // (451-36)/3 = 138.33...
    expectAllIntegers("bandScale", bands);
    const values = [0, 33, 67, 100].map((v) => valueScale(v, 0, 100, 13, 223)); // (223-13)=210, /100 kesirli çarpanlar
    expectAllIntegers("valueScale", values);
    const ticks = tickIndices(37, 7);
    expectAllIntegers("tickIndices", ticks);
    const split = fillSplit([1, 3, 7], [10, 33, 67], [5, 5, 5]);
    expectAllIntegers("fillSplit.ahead", extractNumbers(split.ahead));
    expectAllIntegers("fillSplit.behind", extractNumbers(split.behind));
  });
});

describe("sCurveGeometry — tam piksel", () => {
  it("kesir üretmeyen 7 elemanlı (asal) dizi bile tam piksele oturur", () => {
    const points: EvPanelReport["s_curve"] = Array.from({ length: 7 }, (_, i) => ({
      day: `2026-09-${String(i + 1).padStart(2, "0")}`,
      is_future: false,
      planned_pct_cum: String((i + 1) * 11.111),
      progress_pct_cum: String((i + 1) * 7.777),
      status: "normal",
      variance: "0",
    }));
    const geo = sCurveGeometry(points, (d) => d);
    expectAllIntegers("plannedPath", extractNumbers(geo.plannedPath));
    expectAllIntegers("actualPath", extractNumbers(geo.actualPath));
    expectAllIntegers("fillAhead", extractNumbers(geo.fillAhead));
    expectAllIntegers("fillBehind", extractNumbers(geo.fillBehind));
    for (const p of geo.points) expectAllIntegers(`point ${p.day}`, [p.x, p.plannedY, ...(p.actualY === null ? [] : [p.actualY])]);
    for (const t of geo.yTicks) expectAllIntegers("yTick", [t.y]);
    for (const t of geo.xTicks) expectAllIntegers("xTick", [t.x]);
  });
});

describe("dailyBarsGeometry — tam piksel", () => {
  it("kesir üreten 7 elemanlı dizi + ondalık saat değerleri", () => {
    const points: EvPanelReport["bars"] = Array.from({ length: 7 }, (_, i) => ({
      day: `2026-09-${String(i + 1).padStart(2, "0")}`,
      diary_status: i % 2 === 0 ? "submitted" : "none",
      earned_day: String(11.111 * (i + 1)),
      spent_day: String(7.777 * (i + 1)),
      is_holiday: i === 3,
    }));
    const geo = dailyBarsGeometry(points, (d) => d);
    for (const bar of geo.bars) {
      expectAllIntegers(`bar ${bar.day} earned`, extractNumbers(bar.earnedPath));
      expectAllIntegers(`bar ${bar.day} spent`, extractNumbers(bar.spentPath));
      expectAllIntegers(`bar ${bar.day} x`, [bar.x]);
    }
    expectAllIntegers("holidayPath", extractNumbers(geo.holidayPath));
    for (const dot of geo.unsentDots) expectAllIntegers("unsentDot", [dot.x]);
    for (const t of geo.yTicks) expectAllIntegers("yTick", [t.y]);
    for (const t of geo.xTicks) expectAllIntegers("xTick", [t.x]);
  });
});

describe("pfTrendGeometry — tam piksel", () => {
  const thresholds: DailyPfThresholds = { redBelow: "0.95", greenFrom: "1.00", highAbove: "1.05" };

  it("kesir üreten 11 elemanlı dizi + ondalık PF değerleri", () => {
    const points: EvPanelReport["pf_trend"] = Array.from({ length: 11 }, (_, i) => ({
      day: `2026-09-${String(i + 1).padStart(2, "0")}`,
      pf_day: String(0.87 + i * 0.013),
      pf_rolling: String(0.91 + i * 0.011),
    }));
    const geo = pfTrendGeometry(points, thresholds, (d) => d);
    for (const p of geo.points) expectAllIntegers(`point ${p.day}`, [p.x, ...(p.y === null ? [] : [p.y])]);
    expectAllIntegers("rollingPath", extractNumbers(geo.rollingPath));
    for (const zone of geo.bandZones) expectAllIntegers(`zone ${zone.color}`, [zone.y, zone.height]);
    for (const t of geo.yTicks) expectAllIntegers("yTick", [t.y]);
    for (const t of geo.xTicks) expectAllIntegers("xTick", [t.x]);
    if (geo.today) expectAllIntegers("today", [geo.today.x, ...(geo.today.y === null ? [] : [geo.today.y])]);
  });
});

describe("histogramGeometry — tam piksel", () => {
  it("kesir üreten 9 elemanlı dizi + ondalık kişi sayıları", () => {
    const weeks: EvPanelReport["histogram"] = Array.from({ length: 9 }, (_, i) => ({
      week_no: i + 1,
      week_start: `2026-09-${String(i + 1).padStart(2, "0")}`,
      week_end: `2026-09-${String(i + 7).padStart(2, "0")}`,
      planned_people: String(11.111 * (i + 1)),
      actual_people: String(7.777 * (i + 1)),
      is_future: false,
      working_days: 6,
    }));
    const geo = histogramGeometry(weeks, (w) => `H${w.week_no}`);
    for (const bar of geo.bars) {
      expectAllIntegers(`bar H${bar.weekNo} planned`, extractNumbers(bar.plannedPath));
      expectAllIntegers(`bar H${bar.weekNo} actual`, extractNumbers(bar.actualPath));
      expectAllIntegers(`bar H${bar.weekNo} x`, [bar.x]);
    }
    for (const t of geo.yTicks) expectAllIntegers("yTick", [t.y]);
    for (const t of geo.xTicks) expectAllIntegers("xTick", [t.x]);
  });
});

import { describe, it, expect } from "vitest";

import { histogramGeometry, sCurveGeometry, sCurvePoint, S_LEFT, S_RIGHT, S_BASE, S_TOP } from "./preview-geometry";
import { previewOut } from "./budget-fixtures";

describe("sCurveGeometry — yığılmış alan (BÜT:699-722)", () => {
  const geo = sCurveGeometry(previewOut());

  it("gün ekseni önizleme aralığının tamamı; her disiplin bir alan, rengi VERİDEN", () => {
    expect(geo.days).toHaveLength(14);
    expect(geo.areas).toHaveLength(1);
    expect(geo.areas[0].color).toBe("#2563eb");
    expect(geo.areas[0].d.startsWith(`M${S_LEFT} `)).toBe(true);
    expect(geo.areas[0].d.endsWith("Z")).toBe(true);
  });

  it("toplam çizgi yığının tepesi: son gün %100 → üst kenar", () => {
    const last = sCurvePoint(geo, geo.days.length - 1);
    expect(last.pct).toBeCloseTo(100);
    expect(last.x).toBe(S_RIGHT);
    expect(last.y).toBe(S_TOP);
    expect(geo.totalLine.endsWith(`L${S_RIGHT} ${S_TOP}`)).toBe(true);
  });

  it("kümülatif ileri taşınır: seyrek günde değer düşmez (yarı yol %50)", () => {
    const mid = sCurvePoint(geo, 3);
    expect(mid.pct).toBeCloseTo(50);
    expect(mid.mhr).toBeCloseTo(100);
    expect(mid.y).toBe(Math.round(S_BASE - 0.5 * (S_BASE - S_TOP)));
  });

  it("bütün koordinatlar tam sayı", () => {
    const nums = [...geo.areas[0].d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
    expect(nums.every(Number.isInteger)).toBe(true);
    expect(geo.ticks.every((t) => Number.isInteger(t.x))).toBe(true);
  });

  it("bütçe/aralık yoksa boş", () => {
    const empty = { ...previewOut(), start: null, end: null };
    expect(sCurveGeometry(empty).areas).toEqual([]);
  });
});

describe("histogramGeometry — gereken işçi (BÜT:723-734, K10)", () => {
  const geo = histogramGeometry(previewOut());

  it("hafta başına bir çubuk; eksen alt sınırı 60 (mockup `Math.max(60, …)`)", () => {
    expect(geo.bars).toHaveLength(2);
    expect(geo.yMax).toBe(60);
    expect(geo.bars[0].h).toBeGreaterThan(0);
    expect([geo.bars[0].x, geo.bars[0].w, geo.bars[0].y, geo.bars[0].h].every(Number.isInteger)).toBe(true);
  });

  it("bölüm planlı işçi basamak çizgisi ve tepe hafta", () => {
    expect(geo.line.startsWith("M")).toBe(true);
    expect(geo.peakIndex).toBe(0);
    expect(geo.ticks.map((t) => t.label)).toEqual(["H1"]);
  });
});

import { describe, it, expect } from "vitest";

import { maxRateIndex, ratePlotGeometry } from "./rate-plot-geometry";

describe("ratePlotGeometry — KAT:453-463 min–max nokta grafiği (viewBox 340×110)", () => {
  const input = { standard: 1, rates: [2, 1.5], average: 1.75, min: 1.5, max: 2 };

  it("ölçek: değerler + standart, %25 pay; x = 14 + oran × 312", () => {
    const g = ratePlotGeometry(input);
    // lo = 1 − 0,25 = 0,75 · hi = 2 + 0,25 = 2,25 → 1,5 aralık
    expect(g.standardX).toBe(66);
    expect(g.points.map((p) => p.x)).toEqual([274, 170]);
    expect(g.averageX).toBe(222);
  });

  it("noktalar eksen (y 62) etrafında sırayla yukarı/aşağı kaydırılır (KAT:457)", () => {
    const g = ratePlotGeometry({ ...input, rates: [2, 1.5, 1.2, 1.1] });
    expect(g.points.map((p) => p.y)).toEqual([62, 71, 53, 71]);
  });

  it("mavi min–max zemini", () => {
    expect(ratePlotGeometry(input).band).toEqual({ x: 170, width: 104 });
  });

  it("min = max iken zemin en az 2 birim genişlik alır", () => {
    const g = ratePlotGeometry({ standard: 1, rates: [1.5], average: 1.5, min: 1.5, max: 1.5 });
    expect(g.band?.width).toBe(2);
  });

  it("beş eşit aralıklı eksen etiketi", () => {
    const g = ratePlotGeometry(input);
    expect(g.ticks.map((t) => t.x)).toEqual([14, 92, 170, 248, 326]);
    expect(g.ticks.map((t) => t.value)).toEqual([0.75, 1.125, 1.5, 1.875, 2.25]);
  });

  it("gerçekleşen yoksa (B1): yalnız standart çizgisi, ±%10 pay, zemin/ortalama/nokta yok", () => {
    const g = ratePlotGeometry({ standard: 2, rates: [], average: null, min: null, max: null });
    expect(g.standardX).toBe(170);
    expect(g.points).toEqual([]);
    expect(g.band).toBeNull();
    expect(g.averageX).toBeNull();
  });

  it("standart 0 ve veri yok: bölme sıfıra düşmez, koordinatlar sonlu", () => {
    const g = ratePlotGeometry({ standard: 0, rates: [], average: null, min: null, max: null });
    expect(Number.isFinite(g.standardX)).toBe(true);
    expect(g.ticks.every((t) => Number.isFinite(t.x))).toBe(true);
  });

  it("bütün koordinatlar tam sayı (görsel kapı — cash-flow-geometry kuralı)", () => {
    const g = ratePlotGeometry({ standard: 1.8, rates: [2.12, 1.94, 2.09], average: 2.05, min: 1.94, max: 2.12 });
    const all = [
      g.standardX,
      g.averageX ?? 0,
      g.band?.x ?? 0,
      g.band?.width ?? 0,
      ...g.points.flatMap((p) => [p.x, p.y]),
      ...g.ticks.map((t) => t.x),
    ];
    expect(all.every((v) => Number.isInteger(v))).toBe(true);
  });
});

describe("maxRateIndex — ipucunun varsayılan noktası 'en yüksek' (KAT:460)", () => {
  it("en yüksek oranın sırası; boşsa null", () => {
    expect(maxRateIndex([1.2, 2.1, 2.0])).toBe(1);
    expect(maxRateIndex([])).toBeNull();
  });
});

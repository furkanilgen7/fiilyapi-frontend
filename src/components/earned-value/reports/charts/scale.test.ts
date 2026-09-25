import { describe, it, expect } from "vitest";

import { bandIndexAt, bandScale, bandWidth, fillSplit, indexAt, indexScale, tickIndices, valueScale } from "./scale";

describe("indexScale", () => {
  it("ilk indeks left'e, son indeks right'a düşer", () => {
    expect(indexScale(0, 5, 44, 744)).toBe(44);
    expect(indexScale(4, 5, 44, 744)).toBe(744);
  });

  it("tek elemanlı dizi left'e düşer (bölme sıfır olmaz)", () => {
    expect(indexScale(0, 1, 44, 744)).toBe(44);
  });

  it("Math.round uygulanır (kesirli piksel yok)", () => {
    expect(Number.isInteger(indexScale(1, 3, 0, 10))).toBe(true);
  });
});

describe("indexAt — indexScale'in TERSİ (etkileşimli grafik hover'ı)", () => {
  it("indexScale ile YUVARLAK TRIP: her indeks kendi x'inden geri okunur", () => {
    const n = 9;
    for (let i = 0; i < n; i += 1) {
      const x = indexScale(i, n, 44, 744);
      expect(indexAt(x, n, 44, 744)).toBe(i);
    }
  });

  it("aralık DIŞINA taşan konum en yakın uca KISTIRILIR", () => {
    expect(indexAt(-100, 5, 44, 744)).toBe(0);
    expect(indexAt(9999, 5, 44, 744)).toBe(4);
  });

  it("tek elemanlı dizide HER ZAMAN 0", () => {
    expect(indexAt(500, 1, 44, 744)).toBe(0);
  });
});

describe("bandIndexAt — bandScale'in TERSİ", () => {
  it("bandScale'in ürettiği sol kenardan biraz sağdaki nokta AYNI bandı verir", () => {
    const n = 4;
    for (let i = 0; i < n; i += 1) {
      const left = bandScale(i, n, 36, 450);
      expect(bandIndexAt(left + 1, n, 36, 450)).toBe(i);
    }
  });

  it("aralık DIŞINA taşan konum en yakın banda KISTIRILIR", () => {
    expect(bandIndexAt(-50, 4, 36, 450)).toBe(0);
    expect(bandIndexAt(9999, 4, 36, 450)).toBe(3);
  });

  it("count=0 çökmez", () => {
    expect(bandIndexAt(100, 0, 36, 450)).toBe(0);
  });
});

describe("bandScale / bandWidth", () => {
  it("N bandı eşit genişlikte böler", () => {
    expect(bandWidth(4, 36, 450)).toBeCloseTo((450 - 36) / 4);
    expect(bandScale(0, 4, 36, 450)).toBe(36);
    expect(bandScale(2, 4, 36, 450)).toBe(Math.round(36 + 2 * ((450 - 36) / 4)));
  });

  it("count=0 bölme sıfır olmaz", () => {
    expect(() => bandScale(0, 0, 0, 100)).not.toThrow();
  });
});

describe("valueScale", () => {
  it("min → base, max → top", () => {
    expect(valueScale(0, 0, 100, 14, 224)).toBe(224);
    expect(valueScale(100, 0, 100, 14, 224)).toBe(14);
  });

  it("aralık dışı değer KIRPILIR (Y 0,80–1,20 PF trendi gibi)", () => {
    expect(valueScale(1.5, 0.8, 1.2, 12, 160)).toBe(valueScale(1.2, 0.8, 1.2, 12, 160));
    expect(valueScale(0.1, 0.8, 1.2, 12, 160)).toBe(valueScale(0.8, 0.8, 1.2, 12, 160));
  });

  it("min===max çökmez, base döner", () => {
    expect(valueScale(5, 10, 10, 14, 224)).toBe(224);
  });
});

describe("tickIndices", () => {
  it("count <= maxTicks ise HEPSİ döner", () => {
    expect(tickIndices(3, 8)).toEqual([0, 1, 2]);
  });

  it("ilk ve son indeks HER ZAMAN dahildir", () => {
    const idx = tickIndices(100, 8);
    expect(idx[0]).toBe(0);
    expect(idx[idx.length - 1]).toBe(99);
    expect(idx.length).toBeLessThanOrEqual(8);
  });

  it("count=0 → boş dizi", () => {
    expect(tickIndices(0, 8)).toEqual([]);
  });
});

describe("fillSplit — iki eğrinin İLERİDE/GERİDE dolgusu", () => {
  it("baştan sona AYNI değerde (eşitlik) hiçbir dolgu üretmez (top===base her noktada)", () => {
    const xs = [0, 1, 2, 3];
    const top = [10, 20, 30, 40];
    const base = [10, 20, 30, 40];
    const { ahead, behind } = fillSplit(xs, top, base);
    // top===base her noktada aheadAt() true döner (>=) → tek bir "ahead" parçası,
    // ama alan sıfır genişlikte bir çizgidir (geçerli ama görünmez); behind BOŞ olmalı.
    expect(behind).toBe("");
    expect(ahead).not.toBe("");
  });

  it("hep İLERİDE (top > base her yerde) → yalnız ahead dolar, behind boş", () => {
    const xs = [0, 1, 2];
    const top = [50, 60, 70];
    const base = [10, 20, 30];
    const { ahead, behind } = fillSplit(xs, top, base);
    expect(ahead).toContain("M");
    expect(behind).toBe("");
  });

  it("hep GERİDE (top < base her yerde) → yalnız behind dolar", () => {
    const xs = [0, 1, 2];
    const top = [10, 20, 30];
    const base = [50, 60, 70];
    const { ahead, behind } = fillSplit(xs, top, base);
    expect(behind).toContain("M");
    expect(ahead).toBe("");
  });

  it("KESİŞİM: önde başlar, geride biter → İKİ parça, kesişim noktası ENTERPOLE edilir (uçlardaki x DEĞİL)", () => {
    // top: 0→10, base sabit 5. top>base ilk noktada, top<base ikinci noktada.
    // Kesişim top=base=5 noktası x=0.5te olmalı (doğrusal enterpolasyon).
    const xs = [0, 1];
    const top = [10, 0];
    const base = [5, 5];
    const { ahead, behind } = fillSplit(xs, top, base);
    expect(ahead).toBe("M0 10L1 5L1 5L0 5Z");
    expect(behind).toBe("M1 5L1 0L1 5L1 5Z");
  });

  it("< 2 noktada boş dizi döner (çökmez)", () => {
    expect(fillSplit([0], [1], [1])).toEqual({ ahead: "", behind: "" });
    expect(fillSplit([], [], [])).toEqual({ ahead: "", behind: "" });
  });
});

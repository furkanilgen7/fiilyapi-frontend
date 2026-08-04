import { describe, it, expect } from "vitest";

import { computeGrossMargin, computeGrossProfit } from "./margin";

// Mockup `Şantiye - Hakedişler.dc.html` satır 86: "Brüt Kar Marjı" → %42,6.
describe("computeGrossMargin", () => {
  it("işveren ve taşeron toplamından yüzde marjı hesaplar (mockup kanıtı)", () => {
    // 8.4M işveren, 4.82M taşeron → (8.4-4.82)/8.4 = %42,619...
    const result = computeGrossMargin("8400000", "4820000", true);
    expect(result).not.toBeNull();
    expect(Number(result)).toBeCloseTo(42.62, 1);
  });

  it("işveren toplamı 0 ise sıfıra bölme olur, null döner (yüzde BASILMAZ)", () => {
    expect(computeGrossMargin("0", "1000", true)).toBeNull();
  });

  it("işveren toplamı sayıya çevrilemiyorsa null döner", () => {
    expect(computeGrossMargin("not-a-number", "1000", true)).toBeNull();
  });

  it("taşeron toplamı KISMİ ise (isSubcontractorTotalComplete=false) null döner", () => {
    expect(computeGrossMargin("8400000", "4820000", false)).toBeNull();
  });

  it("taşeron toplamı 0 ise (henüz taşeron hakedişi yok) marj %100 döner", () => {
    expect(computeGrossMargin("1000000", "0", true)).toBe("100.00");
  });

  it("taşeron toplamı işveren toplamından büyükse negatif marj döner (uydurma yok, gerçek sonuç)", () => {
    const result = computeGrossMargin("1000000", "1500000", true);
    expect(Number(result)).toBe(-50);
  });
});

// F-SD T3 · GK410 "Brüt Kar (Bu Ay)" — YÜZDE değil TUTAR. Korkulukları
// `computeGrossMargin` ile aynı; farkları BİLEREK test edilir (T6).
describe("computeGrossProfit", () => {
  it("işveren − taşeron farkını kuruş hassasiyetiyle döner", () => {
    expect(computeGrossProfit("2100000.00", "640000.00", true)).toBe("1460000.00");
  });

  it("kuruşlu değerlerde kayan nokta hatası yapmaz (Number çıkarması DEĞİL)", () => {
    expect(computeGrossProfit("0.30", "0.10", true)).toBe("0.20");
  });

  it("taşeron toplamı KISMİ ise (isSubcontractorTotalComplete=false) null döner", () => {
    expect(computeGrossProfit("2100000.00", "640000.00", false)).toBeNull();
  });

  it("işveren toplamı 0 ise — yüzdeden FARKLI olarak — sayı basılır (negatif kâr meşrudur)", () => {
    expect(computeGrossProfit("0", "640000.00", true)).toBe("-640000.00");
  });

  it("taşeron toplamı işvereni aşarsa negatif sonuç SIFIRA KIRPILMAZ", () => {
    expect(computeGrossProfit("1000000.00", "1500000.00", true)).toBe("-500000.00");
  });

  it("taşeron toplamı zaten negatifse işaret çevrilir (çıkarma toplamaya döner)", () => {
    expect(computeGrossProfit("1000000.00", "-250000.00", true)).toBe("1250000.00");
  });

  it("işveren toplamı sayıya çevrilemiyorsa null döner", () => {
    expect(computeGrossProfit("not-a-number", "640000.00", true)).toBeNull();
  });

  it("taşeron toplamı sayıya çevrilemiyorsa null döner", () => {
    expect(computeGrossProfit("2100000.00", "bozuk", true)).toBeNull();
  });

  it("o ay taşeron hakedişi yoksa (0) kâr işveren tutarına eşittir", () => {
    expect(computeGrossProfit("2100000.00", "0", true)).toBe("2100000.00");
  });
});

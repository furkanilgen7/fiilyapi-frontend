import { describe, it, expect } from "vitest";

import { computeGrossMargin } from "./margin";

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

import { describe, it, expect } from "vitest";

import { DEFAULT_PF_BANDS, pfBand, varianceStatus, type PfBandSettings } from "./bands";

describe("pfBand — K18: bant GÖSTERİLEN (2 ondalık, ROUND_HALF_UP) değere uygulanır", () => {
  it("0,9449 → 0,94 → kırmızı", () => {
    expect(pfBand("0.9449", DEFAULT_PF_BANDS, "weekly")).toBe("red");
  });

  it("0,9450 → 0,95 (tam yarım YUKARI) → sarı", () => {
    expect(pfBand("0.9450", DEFAULT_PF_BANDS, "weekly")).toBe("amber");
  });

  it("0,9499 → 0,95 → sarı (Panel kusuru: ekranda '0,95' yazıp kırmızı boyamaz)", () => {
    expect(pfBand("0.9499", DEFAULT_PF_BANDS, "weekly")).toBe("amber");
  });

  it("number girdide tam yarım da yukarı: 0.945 → 0,95 → sarı", () => {
    expect(pfBand(0.945, DEFAULT_PF_BANDS, "weekly")).toBe("amber");
  });

  it("float kalıntısına düşmez: 1.005 → 1,01 (Math.round yolu 1,00 derdi)", () => {
    // Ölçüldü: 1.005 * 100 === 100.49999999999999. Sınır ayardan gelir; yeşil
    // eşiği 1,01 olan bir şantiyede float yolu bu günü sarı boyardı.
    const bands: PfBandSettings = {
      ...DEFAULT_PF_BANDS,
      weekly: { redBelow: "0.95", greenFrom: "1.01" },
    };
    expect(pfBand(1.005, bands, "weekly")).toBe("green");
  });

  it("0,9999 → 1,00 → yeşil", () => {
    expect(pfBand("0.9999", DEFAULT_PF_BANDS, "weekly")).toBe("green");
  });

  it("haftalık bantta üst sınır YOK: 1,80 yeşil kalır", () => {
    expect(pfBand("1.80", DEFAULT_PF_BANDS, "weekly")).toBe("green");
  });

  it("kümülatif PF haftalık bantları kullanır (K19)", () => {
    const bands: PfBandSettings = {
      daily: { redBelow: "0.95", greenFrom: "1.00", highAbove: "1.05" },
      weekly: { redBelow: "0.90", greenFrom: "0.98" },
    };
    expect(pfBand("0.92", bands, "cumulative")).toBe("amber");
    expect(pfBand("0.92", bands, "daily")).toBe("red");
    expect(pfBand("1.20", bands, "cumulative")).toBe("green");
  });

  it("günlük: 1,0500 yeşil (sınır dahil)", () => {
    expect(pfBand("1.0500", DEFAULT_PF_BANDS, "daily")).toBe("green");
  });

  it("günlük: 1,0501 → 1,05 → yeşil (yuvarlanmış değer sınırı aşmaz)", () => {
    expect(pfBand("1.0501", DEFAULT_PF_BANDS, "daily")).toBe("green");
  });

  it("günlük: 1,055 → 1,06 → şüpheli yüksek (K19, bilgi tonu)", () => {
    expect(pfBand("1.055", DEFAULT_PF_BANDS, "daily")).toBe("high");
  });

  it("günlük varsayılan: 0,95–1,05 YEŞİL, sarı bölge yok (§3.10 F0-1 = §3.7 S6)", () => {
    expect(pfBand("0.9449", DEFAULT_PF_BANDS, "daily")).toBe("red");
    expect(pfBand("0.9450", DEFAULT_PF_BANDS, "daily")).toBe("green");
    expect(pfBand("0.97", DEFAULT_PF_BANDS, "daily")).toBe("green");
  });

  it("highAbove null (rapor pf_bands'i taşımıyor) → 'high' HİÇ üretilmez, çok yüksek değer de yeşil kalır (PLN-F3.1-ek)", () => {
    const bands: PfBandSettings = {
      daily: { redBelow: "0.95", greenFrom: "0.95", highAbove: null },
      weekly: { redBelow: "0.95", greenFrom: "1.00" },
    };
    expect(pfBand("1.20", bands, "daily")).toBe("green");
    expect(pfBand("5.00", bands, "daily")).toBe("green");
  });

  it("günlük yeşil eşiği yükseltilirse sarı doğar (F0-1)", () => {
    const bands: PfBandSettings = {
      ...DEFAULT_PF_BANDS,
      daily: { redBelow: "0.95", greenFrom: "1.00", highAbove: "1.05" },
    };
    expect(pfBand("0.97", bands, "daily")).toBe("amber");
  });

  it.each([null, undefined])("veri yok (%s) → none", (value) => {
    expect(pfBand(value, DEFAULT_PF_BANDS, "daily")).toBe("none");
  });

  it("anlamsız girdi → none (NaN ekrana kaçmaz)", () => {
    expect(pfBand("abc", DEFAULT_PF_BANDS, "weekly")).toBe("none");
    expect(pfBand(Number.NaN, DEFAULT_PF_BANDS, "weekly")).toBe("none");
  });

  it("varsayılanlar: günlük 0,95 · 0,95 · 1,05 (F0-1) · haftalık 0,95 · 1,00 (§3.6)", () => {
    expect(DEFAULT_PF_BANDS).toEqual({
      daily: { redBelow: "0.95", greenFrom: "0.95", highAbove: "1.05" },
      weekly: { redBelow: "0.95", greenFrom: "1.00" },
    });
  });
});

describe("varianceStatus — K27: durum GÖSTERİLEN sapmaya (1 ondalık puan, ROUND_HALF_UP) uygulanır; sınırda Normal", () => {
  // Sapma 0–1 kesir gelir (spec §3.6), tolerans ayardaki gibi PUAN (K6 varsayılan 2,0).
  // Ekran sapmayı 1 ondalık puan basar (`formatVariancePoints`); durum AYNI değerle kurulur.
  it("tam sınır +2,0 puan → normal", () => {
    expect(varianceStatus("0.02", "2.0")).toBe("normal");
  });

  it("tam sınır −2,0 puan → normal", () => {
    expect(varianceStatus("-0.02", "2.0")).toBe("normal");
  });

  it("−2,04 → ekranda '−2,0' → normal (ham değer Geride derdi)", () => {
    expect(varianceStatus("-0.0204", "2.0")).toBe("normal");
  });

  it("+2,04 → '+2,0' → normal", () => {
    expect(varianceStatus("0.0204", "2.0")).toBe("normal");
  });

  it("−2,05 → tam yarım sıfırdan uzağa '−2,1' → late", () => {
    expect(varianceStatus("-0.0205", "2.0")).toBe("late");
  });

  it("+2,05 → '+2,1' → ahead", () => {
    expect(varianceStatus("0.0205", "2.0")).toBe("ahead");
  });

  it("−2,6 puan → late (Panel örneği)", () => {
    expect(varianceStatus("-0.026", "2.0")).toBe("late");
  });

  it("number girdide float kalıntısı sınırı bozmaz: 0.029 → +2,9 → ahead, 0.02 → normal", () => {
    expect(varianceStatus(0.029, 2)).toBe("ahead");
    expect(varianceStatus(0.02, 2)).toBe("normal");
  });

  it("tolerans 0 → yalnız gösterilen '0,0' normal", () => {
    expect(varianceStatus("0.0004", "0")).toBe("normal");
    expect(varianceStatus("0.0005", "0")).toBe("ahead");
  });

  it.each([null, undefined, "abc"])("veri yok (%s) → none", (value) => {
    expect(varianceStatus(value, "2.0")).toBe("none");
  });
});

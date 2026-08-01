import { describe, it, expect } from "vitest";

import {
  formatAmount,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyPrecise,
  formatDecimal,
  formatMonthYear,
  formatPercent,
  formatPeriod,
  formatQuantity,
} from "./format";

describe("formatCompactCurrency", () => {
  it("milyonu M kisaltmasiyla verir", () => {
    expect(formatCompactCurrency("1500000.00")).toBe("₺ 1,5M");
  });
  it("tam milyonda ondalik basmaz", () => {
    expect(formatCompactCurrency(8000000)).toBe("₺ 8M");
  });
  it("binleri B kisaltmasiyla verir", () => {
    expect(formatCompactCurrency(800000)).toBe("₺ 800B");
  });
  it("sifiri oldugu gibi basar", () => {
    expect(formatCompactCurrency(0)).toBe("₺ 0");
  });
});

describe("formatCurrency", () => {
  it("binlik ayraciyla tam tutar verir", () => {
    expect(formatCurrency("24870500.00")).toBe("₺ 24.870.500");
  });
});

describe("formatPercent", () => {
  it("ondalikli yuzdeyi virgulle verir", () => {
    expect(formatPercent("42.50")).toBe("%42,5");
  });
  it("tam sayida ondalik basmaz", () => {
    expect(formatPercent("75.00")).toBe("%75");
  });
  it("sifiri basar", () => {
    expect(formatPercent(0)).toBe("%0");
  });
});

describe("formatMonthYear", () => {
  it("tr-TR kisa ay adiyla basar", () => {
    expect(formatMonthYear("2025-03-15")).toBe("Mar 2025");
  });
  it("aralik ayini Ara olarak basar", () => {
    expect(formatMonthYear("2026-12-01")).toBe("Ara 2026");
  });
});

// Ekran 13 · İş Kalemleri (BOQ) — tablo sayıları (spec §3.4).
// Tabloda ₺ sembolü YOKTUR (mockup 114–116, 176); mevcut formatCurrency ₺ bastığı
// için bu ekranda kullanılamaz.
describe("formatQuantity (miktar — en fazla 3 ondalık)", () => {
  it("sondaki sıfırları atar: 1240.000 → 1.240", () => {
    expect(formatQuantity("1240.000")).toBe("1.240");
  });
  it("ondalığı korur: 1240.500 → 1.240,5", () => {
    expect(formatQuantity("1240.500")).toBe("1.240,5");
  });
  it("üç ondalığa kadar basar: 0.125 → 0,125", () => {
    expect(formatQuantity("0.125")).toBe("0,125");
  });
});

describe("formatAmount (tutar / birim fiyat — en fazla 2 ondalık)", () => {
  it("iki ondalığa kadar: 280.00 → 280", () => {
    expect(formatAmount("280.00")).toBe("280");
  });
  it("büyük tutarı binlik ayraçla basar: 12399900.00 → 12.399.900", () => {
    expect(formatAmount("12399900.00")).toBe("12.399.900");
  });
  it("kalan ondalığı korur: 347200.50 → 347.200,5", () => {
    expect(formatAmount("347200.50")).toBe("347.200,5");
  });
  it("boş BOQ toplamını 0 basar", () => {
    expect(formatAmount("0.00")).toBe("0");
  });
});

describe("BOQ biçimlendiricileri ₺ basmaz", () => {
  it("formatQuantity ve formatAmount ₺ sembolü basmaz", () => {
    expect(formatQuantity("1240.000")).not.toContain("₺");
    expect(formatAmount("12399900.00")).not.toContain("₺");
  });
});

// P7 T2 · Hakediş listesi tutar sütunu (spec §S6: gross_total, kuruş hassasiyetli).
describe("formatCurrencyPrecise", () => {
  it("₺ öneki + binlik ayraçla tam tutar verir", () => {
    expect(formatCurrencyPrecise("2100000.00")).toBe("₺ 2.100.000");
  });
  it("kuruşu atmaz: 2100000.50 → ₺ 2.100.000,5", () => {
    expect(formatCurrencyPrecise("2100000.50")).toBe("₺ 2.100.000,5");
  });
  it("sifiri basar", () => {
    expect(formatCurrencyPrecise("0.00")).toBe("₺ 0");
  });
});

// P7 T2 · Hakediş dönemi (period_year/period_month → "Mayıs 2026").
describe("formatPeriod", () => {
  it("ay + yil basar", () => {
    expect(formatPeriod(2026, 5)).toBe("Mayıs 2026");
  });
  it("aralik ayini basar (12)", () => {
    expect(formatPeriod(2026, 12)).toBe("Aralık 2026");
  });
  it("ocak ayini basar (1)", () => {
    expect(formatPeriod(2026, 1)).toBe("Ocak 2026");
  });
});

describe("formatDecimal", () => {
  it("sayı ve string girdiyi aynı biçimler", () => {
    expect(formatDecimal("1240.5", 3)).toBe(formatDecimal(1240.5, 3));
    expect(formatDecimal(1240.5, 3)).toBe("1.240,5");
  });
  it("verilen ondalık sınırına yuvarlar", () => {
    expect(formatDecimal("1.239", 2)).toBe("1,24");
  });
});

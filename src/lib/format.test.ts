import { describe, it, expect } from "vitest";

import { formatCompactCurrency, formatCurrency, formatMonthYear, formatPercent } from "./format";

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

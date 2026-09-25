import { describe, expect, it } from "vitest";

import { centiToDecimal, formatHours, formatHoursInput, parseHoursInput, toCenti } from "./hours";

// PLN-F2.3 · Saat Dağıtımı sayıları — yüzde-saat (centi) tamsayısıyla kayıpsız.
describe("toCenti — backend Decimal string'i", () => {
  it("'9.00' → 900 · '8.25' → 825 · '0' → 0", () => {
    expect(toCenti("9.00")).toBe(900);
    expect(toCenti("8.25")).toBe(825);
    expect(toCenti("0")).toBe(0);
  });

  it("ikiden fazla ondalık ROUND_HALF_UP ile 2'ye iner", () => {
    expect(toCenti("1.005")).toBe(101);
    expect(toCenti("-2.5")).toBe(-250);
  });

  it("anlamsız değer 0 sayılır (gövdeye NaN kaçmaz)", () => {
    expect(toCenti("abc")).toBe(0);
    expect(toCenti(null)).toBe(0);
  });
});

describe("parseHoursInput — kullanıcının yazdığı hücre", () => {
  it("boş → 0 (hücre boş)", () => {
    expect(parseHoursInput("")).toBe(0);
    expect(parseHoursInput("   ")).toBe(0);
  });

  it("TR virgülü ve nokta kabul edilir", () => {
    expect(parseHoursInput("8,5")).toBe(850);
    expect(parseHoursInput("8.5")).toBe(850);
    expect(parseHoursInput("11")).toBe(1100);
  });

  it("negatif, harf ve 2'den fazla ondalık GEÇERSİZDİR", () => {
    expect(parseHoursInput("-1")).toBeNull();
    expect(parseHoursInput("x")).toBeNull();
    expect(parseHoursInput("1,125")).toBeNull();
  });
});

describe("biçimler", () => {
  it("centiToDecimal gövde için nokta ondalıklı, sondaki sıfırsız", () => {
    expect(centiToDecimal(900)).toBe("9");
    expect(centiToDecimal(850)).toBe("8.5");
    expect(centiToDecimal(825)).toBe("8.25");
    expect(centiToDecimal(-250)).toBe("-2.5");
  });

  it("formatHours ekranda tr-TR ve U+2212 eksi", () => {
    expect(formatHours(900)).toBe("9");
    expect(formatHours(850)).toBe("8,5");
    expect(formatHours(-250)).toBe("−2,5");
    expect(formatHours(32600)).toBe("326");
  });

  it("formatHoursInput hücre metnidir: 0 → boş", () => {
    expect(formatHoursInput(0)).toBe("");
    expect(formatHoursInput(850)).toBe("8,5");
  });
});

describe("formatHoursInput — geri okunabilirlik", () => {
  it("binlik ayracı basmaz: 1000 sa metni yeniden 1000 sa okunur", () => {
    expect(formatHoursInput(100000)).toBe("1000");
    expect(parseHoursInput(formatHoursInput(100000))).toBe(100000);
  });
});

import { describe, it, expect } from "vitest";

import { compareDecimalStrings, roundHalfUp, toDecimalString, toPoints } from "./decimal-input";

describe("toDecimalString — sınırda doğrulama", () => {
  it("backend Decimal string'ini aynen geçirir (boşluk kırpılır)", () => {
    expect(toDecimalString(" 0.9499 ")).toBe("0.9499");
    expect(toDecimalString("+1")).toBe("+1");
    expect(toDecimalString(".5")).toBe(".5");
  });

  it("üstel gösterimli number'ı düz ondalığa çevirir (BigInt'e 'e' kaçmaz)", () => {
    expect(toDecimalString(1e-7)).toBe("0.000000100000");
  });

  it.each([null, undefined, "", "abc", "1,5", "1.2.3", Number.NaN, Number.POSITIVE_INFINITY])(
    "anlamsız ya da boş girdi (%s) → null",
    (value) => {
      expect(toDecimalString(value)).toBeNull();
    },
  );
});

describe("roundHalfUp / toPoints", () => {
  it("negatif tam yarım sıfırdan uzağa: −0,125 @2 → −0,13", () => {
    expect(roundHalfUp("-0.125", 2)).toBe("-0.13");
  });

  it("0–1 kesri kayıpsız puana çevirir", () => {
    expect(toPoints("0.029")).toBe("2.900");
    expect(toPoints(null)).toBeNull();
  });
});

describe("compareDecimalStrings", () => {
  it("ölçek farkına rağmen eşitliği görür", () => {
    expect(compareDecimalStrings("1", "1.00")).toBe(0);
  });

  it("küçük / büyük", () => {
    expect(compareDecimalStrings("0.94", "0.95")).toBe(-1);
    expect(compareDecimalStrings("-2.0", "-2.6")).toBe(1);
  });
});

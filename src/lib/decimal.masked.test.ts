import { describe, expect, it } from "vitest";

import { multiplyDecimalStrings, subtractDecimalStrings, sumDecimalStrings } from "./decimal";

/**
 * Kapsam maskesi (backend `core/field_scope`, kullanici karari 2026-09-19) para
 * ve metraj alanlarini `null` dondurur.
 *
 * 🔴 Ondalik aritmetigi bunu ISLEMEK ZORUNDA ve DOGRU cevap "0" DEGIL `null`dir.
 * Maskeli bir kalemi yok sayip toplamak, ekranda EKSIK bir toplami GERCEK gibi
 * basardi — kullanici bilmedigi bir eksikle karar verirdi. Bilinmeyen bir
 * bilesen iceren toplam BILINMEZDIR.
 */
describe("ondalik aritmetigi maskelenmis (null) degeri isler", () => {
  it("🔴 toplamda TEK maskeli kalem bile sonucu BILINMEZ yapar", () => {
    expect(sumDecimalStrings(["10", null, "5"])).toBeNull();
    expect(sumDecimalStrings([null])).toBeNull();
  });

  it("carpma ve cikarmada da ayni kural", () => {
    expect(multiplyDecimalStrings(null, "3")).toBeNull();
    expect(multiplyDecimalStrings("3", null)).toBeNull();
    expect(subtractDecimalStrings(null, "3")).toBeNull();
    expect(subtractDecimalStrings("3", null)).toBeNull();
  });

  it("🔴 POZITIF KONTROL — maskesiz hesap BOZULMAZ", () => {
    expect(sumDecimalStrings(["10", "5"])).toBe("15");
    expect(multiplyDecimalStrings("3", "4")).toBe("12");
    expect(subtractDecimalStrings("10", "4")).toBe("6");
  });

  it("🔴 BOS liste maskeli DEGILDIR — toplami sifirdir", () => {
    expect(sumDecimalStrings([])).toBe("0");
  });
});

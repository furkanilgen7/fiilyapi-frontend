import { describe, it, expect } from "vitest";

import { sumDecimalStrings } from "./decimal";

describe("sumDecimalStrings", () => {
  it("boş dizide '0' döner", () => {
    expect(sumDecimalStrings([])).toBe("0");
  });

  it("tek elemanlı diziyi aynen döner (2 ondalık)", () => {
    expect(sumDecimalStrings(["12.50"])).toBe("12.50");
  });

  it("mockup verisiyle tutarlı toplar (E15 groups → Ara Toplam)", () => {
    // Betonarme + Elektrik + Mekanik + Duvar (contract_amount sütunu, mockup 110-141)
    expect(
      sumDecimalStrings(["5920000.00", "1240000.00", "980000.00", "2678000.00"]),
    ).toBe("10818000.00");
    // this_amount sütunu — mockup 141: 2.110.000 = calculation.gross
    expect(sumDecimalStrings(["640000.00", "380000.00", "280000.00", "810000.00"])).toBe(
      "2110000.00",
    );
  });

  it("farkli ondalik basamak sayisini ortak olcege getirir", () => {
    expect(sumDecimalStrings(["1", "2.5", "0.125"])).toBe("3.625");
  });

  it("Number() float hatasinin dogurdugu bir toplamda kayipsiz sonuc verir", () => {
    // Number(0.1) + Number(0.2) === 0.30000000000000004 (float hatasi) —
    // string tabanli toplam bu hatayi tasimaz.
    expect(sumDecimalStrings(["0.1", "0.2"])).toBe("0.3");
    expect(Number("0.1") + Number("0.2")).not.toBe(0.3);
  });

  it("negatif degerleri dogru toplar", () => {
    expect(sumDecimalStrings(["100.00", "-40.00"])).toBe("60.00");
    expect(sumDecimalStrings(["-10.5", "-5.25"])).toBe("-15.75");
  });

  it("toplam sifirsa negatif isaret basmaz", () => {
    expect(sumDecimalStrings(["10.00", "-10.00"])).toBe("0.00");
  });

  it("ondalik kismi olmayan tam sayilari da dogru toplar", () => {
    expect(sumDecimalStrings(["3", "4", "5"])).toBe("12");
  });

  it("buyuk tutarlarda (milyonlarca) hassasiyet kaybetmez", () => {
    // BigInt sinir asimini test eder — float toplama burada da hataya acik.
    expect(
      sumDecimalStrings(["999999999999.99", "0.01", "0.01"]),
    ).toBe("1000000000000.01");
  });
});

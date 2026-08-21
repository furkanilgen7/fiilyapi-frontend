import { describe, it, expect } from "vitest";

import {
  divideDecimalStrings,
  isZeroDecimalString,
  multiplyDecimalStrings,
  parseCountInput,
  subtractDecimalStrings,
  sumDecimalStrings,
} from "./decimal";

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

describe("multiplyDecimalStrings", () => {
  it("float kalintisi uretmez (0.1 x 3)", () => {
    // Number(0.1) * 3 === 0.30000000000000004 — satir tutari boyle basilirdi.
    expect(multiplyDecimalStrings("0.1", "3")).toBe("0.3");
  });

  it("olcekler toplanir (miktar x birim fiyat)", () => {
    expect(multiplyDecimalStrings("15", "21500")).toBe("322500");
    expect(multiplyDecimalStrings("2.5", "1.25")).toBe("3.125");
  });

  it("negatif miktar (adjustment) isareti korur", () => {
    expect(multiplyDecimalStrings("-5", "100")).toBe("-500");
  });

  it("sifir carpani negatif isaret basmaz", () => {
    expect(multiplyDecimalStrings("-5", "0")).toBe("0");
  });
});

describe("subtractDecimalStrings", () => {
  it("olcekleri farkli terimleri hizalar", () => {
    expect(subtractDecimalStrings("100", "99.99")).toBe("0.01");
    expect(subtractDecimalStrings("100.00", "100")).toBe("0.00");
  });

  it("negatif fark isareti korur", () => {
    expect(subtractDecimalStrings("40.00", "100.00")).toBe("-60.00");
  });

  /**
   * 🔴 AYRIŞMA NOKTASI (F-FAT2 kanonu): float aritmetigi burada YANLIS cevap
   * verir — `0.1 + 0.2 - 0.3 === 5.55e-17`, yani denge kapisi "dengesiz" derdi.
   */
  it("float kalintisi URETMEZ (0.1 + 0.2 vs 0.3)", () => {
    const debit = sumDecimalStrings(["0.1", "0.2"]);
    expect(subtractDecimalStrings(debit, "0.3")).toBe("0.0");
    expect(Number("0.1") + Number("0.2") - Number("0.3")).not.toBe(0);
  });

  it("cok satirli birikimde de kaymaz (1.1 x 3 vs 3.30)", () => {
    const debit = sumDecimalStrings(["1.1", "1.1", "1.1"]);
    expect(subtractDecimalStrings(debit, "3.30")).toBe("0.00");
    expect(Number("1.1") + Number("1.1") + Number("1.1")).not.toBe(3.3);
  });
});

describe("isZeroDecimalString", () => {
  it("her olcekteki sifiri sifir sayar", () => {
    for (const zero of ["0", "0.0", "0.00", "-0.000", "+0"]) {
      expect(isZeroDecimalString(zero), zero).toBe(true);
    }
  });

  it("bir kurusluk farki sifir SAYMAZ", () => {
    expect(isZeroDecimalString("0.01")).toBe(false);
    expect(isZeroDecimalString("-0.01")).toBe(false);
  });

  it("sayi olmayan girdi sifir DEGILDIR (sessiz gecis yok)", () => {
    expect(isZeroDecimalString("")).toBe(false);
    expect(isZeroDecimalString("abc")).toBe(false);
    expect(isZeroDecimalString(".")).toBe(false);
  });
});

describe("divideDecimalStrings — F-UNIT1 · UE 89 m² birim fiyat", () => {
  it("float kalintisi URETMEZ (1480000 / 178)", () => {
    // 🔴 T1 olcumu: `Number("1480000") / Number("178")` = 8314.610000000001.
    // Kalinti hem salt-okunur kutuya hem sunucu paritesine sizardi.
    expect(divideDecimalStrings("1480000", "178", 2)).toBe("8314.61");
    expect(Number("1480000") / Number("178")).not.toBe(8314.61);
  });

  it("ROUND_HALF_UP: tam yarim SIFIRDAN UZAGA yuvarlanir", () => {
    // 1 / 8 = 0.125 → ucuncu basamak tam yarim → 0.13 (0.12 DEGIL).
    expect(divideDecimalStrings("1", "8", 2)).toBe("0.13");
    expect(divideDecimalStrings("-1", "8", 2)).toBe("-0.13");
    // 1000 / 3 = 333.333… → asagi.
    expect(divideDecimalStrings("1000", "3", 2)).toBe("333.33");
  });

  it("olcek TAM olarak istenen basamak sayisini basar", () => {
    expect(divideDecimalStrings("100", "8", 2)).toBe("12.50");
    expect(divideDecimalStrings("10", "2", 0)).toBe("5");
    expect(divideDecimalStrings("10", "4", 4)).toBe("2.5000");
  });

  it("bolen ve bolunen ondalikli olabilir", () => {
    expect(divideDecimalStrings("1480000.00", "178.00", 2)).toBe("8314.61");
    expect(divideDecimalStrings("7.5", "2.5", 2)).toBe("3.00");
  });

  it("SIFIRA bolme null doner (sunucu paritesi: `not gross_area_m2`)", () => {
    expect(divideDecimalStrings("1480000", "0", 2)).toBeNull();
    expect(divideDecimalStrings("1480000", "0.00", 2)).toBeNull();
  });

  it("isaret dogru tasinir", () => {
    expect(divideDecimalStrings("-100", "4", 2)).toBe("-25.00");
    expect(divideDecimalStrings("100", "-4", 2)).toBe("-25.00");
    expect(divideDecimalStrings("-100", "-4", 2)).toBe("25.00");
  });
});

describe("parseCountInput — tam sayi kutulari (BE 78/79/81/83/85 · UE 80)", () => {
  it("dolu kutu SAYI doner", () => {
    expect(parseCountInput("8")).toBe(8);
    expect(parseCountInput(" 12 ")).toBe(12);
    expect(parseCountInput("0")).toBe(0);
  });

  it("BOS kutu null doner — 0 UYDURULMAZ", () => {
    // "girilmedi" ile "sifir girildi" ayni sey DEGILDIR; `Number("")` ikisini
    // ayni yaziyordu (T1'in taslak kusuru).
    expect(parseCountInput("")).toBeNull();
    expect(parseCountInput("   ")).toBeNull();
  });

  it("anlamsiz / ondalikli girdi null doner (NaN kacmaz)", () => {
    expect(parseCountInput("abc")).toBeNull();
    expect(parseCountInput("3.5")).toBeNull();
    expect(parseCountInput("3,5")).toBeNull();
    expect(parseCountInput("1e3")).toBeNull();
  });

  it("guvenli tamsayi araligi disi null doner", () => {
    expect(parseCountInput("9007199254740993")).toBeNull();
  });

  it("isaretli girdi okunur (sunucu sinirlarini istemci ZORLAMAZ)", () => {
    expect(parseCountInput("-2")).toBe(-2);
    expect(parseCountInput("+4")).toBe(4);
  });
});

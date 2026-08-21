import { describe, expect, it } from "vitest";

import { deriveUnitPricePerM2 } from "./derive";
import { emptyUnitFormValues, type UnitFormValues } from "./form-state";

function values(overrides: Partial<UnitFormValues> = {}): UnitFormValues {
  return { ...emptyUnitFormValues(), ...overrides };
}

describe("deriveUnitPricePerM2 — UE 89 'm² Birim Fiyat'", () => {
  it("mockup verisi: 1.480.000 ÷ 178 = 8.314,61 (sunucu paritesi, iki ondalık)", () => {
    // 🔴 Mockup kutusunda `value="8315"` yazar (tam sayıya yuvarlanmış örnek
    // veri). Sunucu aynı hesabı `_quantize_money` ile iki ondalığa indirir ve
    // `8314.61` döner; F-P8 satış formu bu değeri "8.314,61" olarak basıyor.
    // İki yüzey aynı sayıyı göstermek zorundadır.
    const derived = deriveUnitPricePerM2(values({ listPrice: "1480000", grossAreaM2: "178" }));
    expect(derived.value).toBe("8314.61");
    expect(derived.text).toBe("8.314,61");
  });

  it("yuvarlama ROUND_HALF_UP'tır (sunucuyla aynı)", () => {
    // 1000 / 3 = 333,333… → 333.33
    expect(deriveUnitPricePerM2(values({ listPrice: "1000", grossAreaM2: "3" })).value).toBe(
      "333.33",
    );
    // 100 / 8 = 12,5 → tam iki basamak
    expect(deriveUnitPricePerM2(values({ listPrice: "100", grossAreaM2: "8" })).value).toBe(
      "12.50",
    );
  });

  it("TR virgüllü girdi de hesaplanır", () => {
    const derived = deriveUnitPricePerM2(
      values({ listPrice: "1480000,00", grossAreaM2: "178,00" }),
    );
    expect(derived.value).toBe("8314.61");
  });
});

describe("deriveUnitPricePerM2 — hesaplanamayan haller '—' basar", () => {
  it("liste fiyatı boşsa null", () => {
    const derived = deriveUnitPricePerM2(values({ grossAreaM2: "178" }));
    expect(derived.value).toBeNull();
    expect(derived.text).toBe("—");
  });

  it("brüt m² boşsa null", () => {
    const derived = deriveUnitPricePerM2(values({ listPrice: "1480000" }));
    expect(derived.value).toBeNull();
    expect(derived.text).toBe("—");
  });

  it("brüt m² SIFIRSA null — sıfıra bölünmez (sunucu: `not self.gross_area_m2`)", () => {
    const derived = deriveUnitPricePerM2(values({ listPrice: "1480000", grossAreaM2: "0" }));
    expect(derived.value).toBeNull();
    expect(derived.text).toBe("—");
  });

  it("anlamsız girdi null verir (NaN ekrana kaçmaz)", () => {
    expect(
      deriveUnitPricePerM2(values({ listPrice: "abc", grossAreaM2: "178" })).value,
    ).toBeNull();
  });
});

describe("deriveUnitPricePerM2 — taban BRÜT m²'dir (UE 89 ipucu)", () => {
  it("net m² dolu ama brüt boşsa hesaplanmaz", () => {
    const derived = deriveUnitPricePerM2(values({ listPrice: "1480000", netAreaM2: "152" }));
    expect(derived.value).toBeNull();
  });

  it("net m² değişse bile sonuç DEĞİŞMEZ", () => {
    const a = deriveUnitPricePerM2(
      values({ listPrice: "1480000", grossAreaM2: "178", netAreaM2: "152" }),
    );
    const b = deriveUnitPricePerM2(
      values({ listPrice: "1480000", grossAreaM2: "178", netAreaM2: "100" }),
    );
    expect(a).toEqual(b);
  });
});

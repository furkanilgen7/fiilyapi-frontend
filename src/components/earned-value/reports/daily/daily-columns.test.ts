import { describe, expect, it } from "vitest";

import { rateExceedsPlanned } from "./daily-columns";

/**
 * Lider denetimi (8. tur) — GİR:489 gerçek oran kırmızı yazı kuralı ondalık
 * kanonuna (`compareDecimalStrings`) geçti; `Number(x) > Number(y)` QURR'daki
 * `isUnitRateOver` ile AYNI gerekçeyle reddedilmişti (17+ basamaklı ondalık
 * dizeler `Number()`de eşitlenip precision kaybeder).
 */
describe("rateExceedsPlanned — ondalık kanonu (GİR:489)", () => {
  it("normal durum: gerçek > planlı → true", () => {
    expect(rateExceedsPlanned("1.5", "1.0")).toBe(true);
  });

  it("normal durum: gerçek < planlı → false", () => {
    expect(rateExceedsPlanned("0.8", "1.0")).toBe(false);
  });

  it("eşit → false", () => {
    expect(rateExceedsPlanned("1.0", "1.0")).toBe(false);
  });

  it("Number'ın YANILDIĞI değer çifti — '1.00000000000000009' > '1' → true (Number ikisini de 1'e yuvarlar, false derdi)", () => {
    expect(rateExceedsPlanned("1.00000000000000009", "1")).toBe(true);
  });

  it("null girdi → false, çökme yok", () => {
    expect(rateExceedsPlanned(null, "1.0")).toBe(false);
    expect(rateExceedsPlanned("1.0", null)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";

import { isoPeriod, shiftPeriod } from "./derive";

// F-SD T4 · ay gezinmesi (HÖ90/92). `Date` aritmetiği kullanılmadığı için
// yıl taşmaları elle doğrulanır.
describe("shiftPeriod", () => {
  it("ay ileri/geri kaydırır", () => {
    expect(shiftPeriod({ year: 2026, month: 7 }, 1)).toEqual({ year: 2026, month: 8 });
    expect(shiftPeriod({ year: 2026, month: 7 }, -1)).toEqual({ year: 2026, month: 6 });
  });

  it("Aralık→Ocak ve Ocak→Aralık taşmasını yürütür", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("bir yıldan uzun kaydırmayı da doğru yürütür", () => {
    expect(shiftPeriod({ year: 2026, month: 3 }, 14)).toEqual({ year: 2027, month: 5 });
    expect(shiftPeriod({ year: 2026, month: 3 }, -14)).toEqual({ year: 2025, month: 1 });
  });

  it("`isoPeriod` çıktısıyla birlikte çalışır", () => {
    expect(shiftPeriod(isoPeriod("2026-01-15"), -1)).toEqual({ year: 2025, month: 12 });
  });
});

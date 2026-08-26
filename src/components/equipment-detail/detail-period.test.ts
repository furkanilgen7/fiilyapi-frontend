import { describe, it, expect } from "vitest";

import { periodFromIsoDate, recentPeriods } from "./detail-period";

describe("periodFromIsoDate", () => {
  it("sunucu damgasından dönemi okur", () => {
    expect(periodFromIsoDate("2026-08-20")).toEqual({ year: 2026, month: 8 });
  });

  it("ayrıştırılamayan damgada `null` döner (uydurma dönem YOK)", () => {
    expect(periodFromIsoDate("20.08.2026")).toBeNull();
    expect(periodFromIsoDate("")).toBeNull();
  });
});

describe("recentPeriods", () => {
  it("İLK öğe dönemin KENDİSİDİR ve geriye doğru gider", () => {
    expect(recentPeriods({ year: 2026, month: 8 }, 3)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
      { year: 2026, month: 6 },
    ]);
  });

  it("YIL SINIRINI geçer — ocak ayında bir önceki yıla döner", () => {
    expect(recentPeriods({ year: 2026, month: 1 }, 3)).toEqual([
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
      { year: 2025, month: 11 },
    ]);
  });
});

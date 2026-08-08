import { describe, it, expect } from "vitest";

import { currentPeriod, monthDayIsoList, parsePeriod, shiftPeriod } from "./month";

describe("currentPeriod", () => {
  it("mockup'in sabit ayini DEGIL gercek takvimi kullanir", () => {
    expect(currentPeriod(new Date(2026, 7, 14))).toEqual({ year: 2026, month: 8 });
  });
});

describe("shiftPeriod", () => {
  it("ay ilerletir", () => {
    expect(shiftPeriod({ year: 2026, month: 8 }, 1)).toEqual({ year: 2026, month: 9 });
  });

  it("aralik+1 yili ilerletir", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("ocak-1 yili geriletir", () => {
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("parsePeriod", () => {
  const now = new Date(2026, 7, 14);

  it("gecerli parametreleri okur", () => {
    expect(parsePeriod("2026", "3", now)).toEqual({ year: 2026, month: 3 });
  });

  it("eksik parametrede icinde bulunulan aya duser", () => {
    expect(parsePeriod(null, null, now)).toEqual({ year: 2026, month: 8 });
  });

  it("gecersiz ay (13) bos ekran URETMEZ, icinde bulunulan aya duser", () => {
    expect(parsePeriod("2026", "13", now)).toEqual({ year: 2026, month: 8 });
  });

  it("sayi olmayan deger icinde bulunulan aya duser", () => {
    expect(parsePeriod("abc", "x", now)).toEqual({ year: 2026, month: 8 });
  });
});

describe("monthDayIsoList", () => {
  it("31 gunluk ayi tam basar", () => {
    const days = monthDayIsoList(2026, 8);
    expect(days).toHaveLength(31);
    expect(days[0]).toBe("2026-08-01");
    expect(days[30]).toBe("2026-08-31");
  });

  it("subat 28/29 farkini dogru verir", () => {
    expect(monthDayIsoList(2026, 2)).toHaveLength(28);
    expect(monthDayIsoList(2028, 2)).toHaveLength(29);
  });
});

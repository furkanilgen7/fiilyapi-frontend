import { describe, expect, it } from "vitest";

import { formatDayLongWithWeekday, formatWeekRangeShort, shiftIsoDate } from "./report-date-format";

describe("shiftIsoDate", () => {
  it("ileri/geri gün kaydırır, ay taşmasını Date halleder", () => {
    expect(shiftIsoDate("2026-09-24", 1)).toBe("2026-09-25");
    expect(shiftIsoDate("2026-09-24", -1)).toBe("2026-09-23");
    expect(shiftIsoDate("2026-09-30", 1)).toBe("2026-10-01");
  });
});

// GİR:509 `longs` sabitiyle birebir — "24 Eylül 2026 Perşembe".
describe("formatDayLongWithWeekday", () => {
  it("gün + ay adı + yıl + haftanın günü", () => {
    expect(formatDayLongWithWeekday("2026-09-24")).toBe("24 Eylül 2026 Perşembe");
    expect(formatDayLongWithWeekday("2026-09-22")).toBe("22 Eylül 2026 Salı");
  });

  it("ayrıştırılamayan girdi aynen döner", () => {
    expect(formatDayLongWithWeekday("bozuk")).toBe("bozuk");
  });

  it("aralık dışı ay (13) aynen döner — formatMonthName'in sayı yedeğine düşmez", () => {
    expect(formatDayLongWithWeekday("2026-13-01")).toBe("2026-13-01");
  });
});

// Q:354 `ranges` sabitiyle birebir — "18–24 Eyl 2026".
describe("formatWeekRangeShort", () => {
  it("aynı ay içi — kısa tire, kısa ay adı", () => {
    expect(formatWeekRangeShort("2026-09-18", "2026-09-24")).toBe("18–24 Eyl 2026");
  });

  it("farklı ay, aynı yıl", () => {
    expect(formatWeekRangeShort("2026-08-31", "2026-09-06")).toBe("31 Ağu – 6 Eyl 2026");
  });

  it("farklı yıl", () => {
    expect(formatWeekRangeShort("2025-12-29", "2026-01-04")).toBe("29 Ara 2025 – 4 Oca 2026");
  });
});

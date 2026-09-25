import { describe, expect, it } from "vitest";

import { formatDayDots, formatDayWeek } from "./day-header";

// İ:113 — başlık alt satırının sonu "Gün 142 · H21" (K23: rapor no = gün no).
describe("formatDayWeek", () => {
  it("gün ve hafta no", () => {
    expect(formatDayWeek(142, 21)).toBe("Gün 142 · H21");
  });

  it("takvim dışı gün (null) → ek yok; yalnız biri varsa o basılır", () => {
    expect(formatDayWeek(null, null)).toBeNull();
    expect(formatDayWeek(3, null)).toBe("Gün 3");
  });
});

// İ:529 — tablet şeridi "24.09 · A-Blok" (gün.ay, yılsız).
describe("formatDayDots", () => {
  it("YYYY-MM-DD → dd.mm (string ayrıştırma, saat dilimi kaymaz)", () => {
    expect(formatDayDots("2026-09-24")).toBe("24.09");
    expect(formatDayDots("2026-01-05")).toBe("05.01");
  });

  it("ayrıştırılamayan girdi aynen döner", () => {
    expect(formatDayDots("bozuk")).toBe("bozuk");
  });
});

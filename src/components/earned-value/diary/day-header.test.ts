import { describe, expect, it } from "vitest";

import { formatDayWeek } from "./day-header";

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

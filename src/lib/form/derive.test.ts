import { describe, it, expect } from "vitest";

import { durationDays } from "./derive";

describe("durationDays (paylaşılan form türevi)", () => {
  it("uç-dahil hesaplar: 01.01 - 10.01 => 10", () => {
    expect(durationDays("2026-01-01", "2026-01-10")).toBe(10);
  });

  it("ters tarihte null döner", () => {
    expect(durationDays("2026-01-10", "2026-01-01")).toBeNull();
  });

  it("tek tarih girildiğinde null döner", () => {
    expect(durationDays("2026-01-01", "")).toBeNull();
    expect(durationDays("", "2026-01-10")).toBeNull();
    expect(durationDays(null, null)).toBeNull();
  });

  it("geçersiz takvim gününde null döner", () => {
    expect(durationDays("2026-02-30", "2026-03-01")).toBeNull();
  });

  it("aynı gün 1 döner (uç-dahil)", () => {
    expect(durationDays("2026-01-01", "2026-01-01")).toBe(1);
  });
});

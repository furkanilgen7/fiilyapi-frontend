import { describe, it, expect } from "vitest";

import { remainingDays } from "./remainingDays";

const TODAY = new Date(2026, 7, 2); // 2 Ağustos 2026 (aynı gün, currentDate ile birebir)

describe("remainingDays — Kalan Gün türevi (D91-93)", () => {
  it("end_date null ise null döner (bitiş tarihi hiç girilmemiş)", () => {
    expect(remainingDays(null, TODAY)).toBeNull();
  });

  it("bugünün tarihiyle aynıysa 0 döner", () => {
    expect(remainingDays("2026-08-02", TODAY)).toBe(0);
  });

  it("gelecekteki tarih için pozitif gün sayısı döner", () => {
    expect(remainingDays("2026-09-01", TODAY)).toBe(30);
  });

  it("geçmişteki tarih için negatif gün sayısı döner (gecikme)", () => {
    expect(remainingDays("2026-07-28", TODAY)).toBe(-5);
  });

  it("bir yıl sonrası için doğru gün sayısını hesaplar", () => {
    expect(remainingDays("2027-08-02", TODAY)).toBe(365);
  });
});

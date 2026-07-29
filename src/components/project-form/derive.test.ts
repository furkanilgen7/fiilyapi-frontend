import { describe, it, expect } from "vitest";
import { durationDays, totalBudget, profitMargin } from "./derive";

describe("durationDays — uç-dahil sözleşme süresi (§4.5)", () => {
  it("iki uç günü de sayar (end − start + 1)", () => {
    // 2025-03-01 → 2025-03-10: 10 takvim günü (uç-dahil)
    expect(durationDays("2025-03-01", "2025-03-10")).toBe(10);
  });

  it("tek günlük sözleşme (start == end) 1 döner", () => {
    expect(durationDays("2025-03-01", "2025-03-01")).toBe(1);
  });

  it("ay/yıl sınırını doğru geçer", () => {
    // 2024 artık yıl: 29 Şubat dahil
    expect(durationDays("2024-02-01", "2024-03-01")).toBe(30);
  });

  it("tarihlerden biri boşsa null döner (0 değil)", () => {
    expect(durationDays("", "2025-03-10")).toBeNull();
    expect(durationDays("2025-03-01", "")).toBeNull();
    expect(durationDays(null, null)).toBeNull();
    expect(durationDays(undefined, "2025-03-10")).toBeNull();
  });

  it("bitiş başlangıçtan önceyse null döner", () => {
    expect(durationDays("2025-03-10", "2025-03-01")).toBeNull();
  });

  it("geçersiz tarih null döner", () => {
    expect(durationDays("abc", "2025-03-10")).toBeNull();
  });
});

const lines = {
  material: 8_000_000,
  labor: 6_000_000,
  subcontractor: 5_000_000,
  overhead: 2_860_000,
};

describe("totalBudget", () => {
  it("dört kalemi toplar", () => {
    // 8.000.000 + 6.000.000 + 5.000.000 + 2.860.000 = 21.860.000
    expect(totalBudget(lines)).toBe(21_860_000);
  });

  it("kuruş yuvarlama hatasına düşmez", () => {
    expect(
      totalBudget({ material: 0.1, labor: 0.2, subcontractor: 0, overhead: 0 }),
    ).toBe(0.3);
  });
});

describe("profitMargin — mockup örneği (§4.8)", () => {
  it("22.400.000 − 21.860.000 = 540.000 ve %2,4", () => {
    const r = profitMargin(22_400_000, lines);
    expect(r.totalBudget).toBe(21_860_000);
    expect(r.profit).toBe(540_000);
    // 540.000 / 22.400.000 × 100 = 2,4107… → biçimlendirme katmanı %2,4 basar
    expect(r.marginPct).toBeCloseTo(2.4107, 3);
  });

  it("negatif kâr (zarar) döndürebilir", () => {
    const r = profitMargin(20_000_000, lines);
    expect(r.profit).toBe(-1_860_000);
    expect(r.marginPct).toBeLessThan(0);
  });

  it("contractAmount 0 → marginPct null (sahte %0 yok)", () => {
    const r = profitMargin(0, lines);
    expect(r.profit).toBe(-21_860_000);
    expect(r.marginPct).toBeNull();
  });

  it("contractAmount boş/null → marginPct null", () => {
    expect(profitMargin(null, lines).marginPct).toBeNull();
    expect(profitMargin(undefined, lines).marginPct).toBeNull();
  });
});

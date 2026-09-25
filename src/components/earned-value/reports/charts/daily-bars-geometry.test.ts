import { describe, it, expect } from "vitest";

import { dailyBarsGeometry, D_BASE } from "./daily-bars-geometry";
import type { EvPanelReport } from "@/lib/api/models";

type BarPoint = EvPanelReport["bars"][number];

function bar(overrides: Partial<BarPoint> = {}): BarPoint {
  return { day: "2026-09-24", diary_status: "submitted", earned_day: "300", spent_day: "310", is_holiday: false, ...overrides };
}

const label = (day: string) => day.slice(8, 10);

describe("dailyBarsGeometry", () => {
  it("boş dizi çökmez", () => {
    const geo = dailyBarsGeometry([], label);
    expect(geo.bars).toEqual([]);
    expect(geo.today).toBeNull();
  });

  it("tatil günü → çubuk BASILMAZ, holidayPath'e kolon eklenir", () => {
    const points = [bar({ day: "2026-09-27", is_holiday: true, earned_day: null, spent_day: null, diary_status: "none" })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.bars[0]!.earnedPath).toBe("");
    expect(geo.bars[0]!.spentPath).toBe("");
    expect(geo.holidayPath).not.toBe("");
  });

  it("tatilde `isUnsent` HER ZAMAN false — nokta basılmaz (boş kolon zaten tarama gösterir)", () => {
    const points = [bar({ is_holiday: true, diary_status: "none" })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.bars[0]!.isUnsent).toBe(false);
    expect(geo.unsentDots).toEqual([]);
  });

  it("iş günü + diary_status none/draft → isUnsent true, nokta eklenir", () => {
    const points = [bar({ diary_status: "none" }), bar({ day: "2026-09-25", diary_status: "draft" })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.bars[0]!.isUnsent).toBe(true);
    expect(geo.bars[1]!.isUnsent).toBe(true);
    expect(geo.unsentDots).toHaveLength(2);
  });

  it("iş günü + diary_status submitted → isUnsent false", () => {
    const points = [bar({ diary_status: "submitted" })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.bars[0]!.isUnsent).toBe(false);
  });

  it("değer sıfır/negatif değilse çubuk taban çizgisine (D_BASE) oturur", () => {
    const points = [bar({ earned_day: "0", spent_day: "100" })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.bars[0]!.earnedPath).toBe("");
    expect(geo.bars[0]!.spentPath).toContain(`M`);
    expect(geo.bars[0]!.spentPath).toContain(String(D_BASE));
  });

  it("today alanı SON TATİL OLMAYAN günü verir (tatil son gündeyse geriye bakar)", () => {
    const points = [bar({ day: "2026-09-24" }), bar({ day: "2026-09-27", is_holiday: true, earned_day: null, spent_day: null })];
    const geo = dailyBarsGeometry(points, label);
    expect(geo.today?.day).toBe("2026-09-24");
  });

  it("yMax en az D_MIN_MAX (40); büyük değerlerde 10'a yuvarlanarak büyür", () => {
    const geoSmall = dailyBarsGeometry([bar({ earned_day: "5", spent_day: "5" })], label);
    expect(geoSmall.yMax).toBe(40);
    const geoBig = dailyBarsGeometry([bar({ earned_day: "355", spent_day: "10" })], label);
    expect(geoBig.yMax).toBe(360);
  });
});

import { describe, expect, it } from "vitest";

import type { EvDailyReport } from "@/lib/api/models";

import { buildTrendChart } from "./trend-chart";

function point(day: string, planned: string | null, actual: string | null, opts: Partial<EvDailyReport["trend"][number]> = {}): EvDailyReport["trend"][number] {
  return {
    day,
    planned_pct_cum: planned,
    progress_pct_cum: actual,
    delta: null,
    is_holiday: false,
    is_draft: false,
    is_future: false,
    earned_day: null,
    spent_day: null,
    pf_day: null,
    pf_rolling: null,
    ...opts,
  };
}

describe("buildTrendChart — GİR 7 günlük mini çizgi (Math.round koordinat)", () => {
  it("boş trend → null", () => {
    expect(buildTrendChart([])).toBeNull();
  });

  it("hepsi gelecek (is_future) → null (görünür nokta yok)", () => {
    const trend = [point("2026-09-25", "0.5", "0.5", { is_future: true })];
    expect(buildTrendChart(trend)).toBeNull();
  });

  it("koordinatlar TAM SAYI (Math.round)", () => {
    const trend = [point("2026-09-18", "0.42", "0.459"), point("2026-09-24", "0.4848", "0.4586")];
    const chart = buildTrendChart(trend)!;
    expect(chart.points.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
  });

  it("nokta sayısı gerçek (progress_pct_cum) DOLU günlerle eşleşir", () => {
    const trend = [point("2026-09-18", "0.4", "0.41"), point("2026-09-19", "0.42", null)];
    const chart = buildTrendChart(trend)!;
    expect(chart.points).toHaveLength(1);
  });

  it("taslak gün (is_draft) noktası işaretlenir", () => {
    const trend = [point("2026-09-21", "0.43", "0.47", { is_draft: true })];
    const chart = buildTrendChart(trend)!;
    expect(chart.points[0].isDraft).toBe(true);
  });

  it("tüm değerler EŞİTSE (span=0) çökmez, geçerli path üretir", () => {
    const trend = [point("2026-09-18", "0.5", "0.5"), point("2026-09-19", "0.5", "0.5")];
    const chart = buildTrendChart(trend)!;
    expect(chart.actualPath).toMatch(/^M\d+ \d+ L\d+ \d+$/);
  });
});

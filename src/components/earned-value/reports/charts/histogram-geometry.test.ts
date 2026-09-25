import { describe, it, expect } from "vitest";

import { histogramGeometry, HG_BASE } from "./histogram-geometry";
import type { EvPanelReport } from "@/lib/api/models";

type HistogramWeek = EvPanelReport["histogram"][number];

function week(overrides: Partial<HistogramWeek> = {}): HistogramWeek {
  return { week_no: 21, week_start: "2026-09-21", week_end: "2026-09-27", planned_people: "20", actual_people: "18", is_future: false, working_days: 6, ...overrides };
}

const label = (w: HistogramWeek) => `H${w.week_no ?? "?"}`;

describe("histogramGeometry", () => {
  it("boş dizi çökmez", () => {
    const geo = histogramGeometry([], label);
    expect(geo.bars).toEqual([]);
    expect(geo.today).toBeNull();
  });

  it("GELECEK hafta (is_future) → actualPath BASILMAZ (değer dolu olsa BİLE), plannedPath basılır", () => {
    // `actual_people` dolu bir değerle gelse bile (backend hatası/eski veri
    // ihtimaline karşı) istemci gelecek haftanın "gerçekleşen"ini ÇİZMEZ —
    // `is_future` bayrağı `actual_people`in null olup olmamasından BAĞIMSIZ
    // bir bekçidir (yalnız null-kontrolüne güvenmez).
    const weeks = [week({ is_future: true, actual_people: "12" })];
    const geo = histogramGeometry(weeks, label);
    expect(geo.bars[0]!.actualPath).toBe("");
    expect(geo.bars[0]!.plannedPath).not.toBe("");
  });

  it("today SON GELECEK OLMAYAN haftayı verir", () => {
    const weeks = [week({ week_no: 20, is_future: false }), week({ week_no: 21, is_future: true, actual_people: null })];
    const geo = histogramGeometry(weeks, label);
    expect(geo.today?.weekNo).toBe(20);
  });

  it("planned_people sıfırsa çubuk basılmaz", () => {
    const weeks = [week({ planned_people: "0" })];
    const geo = histogramGeometry(weeks, label);
    expect(geo.bars[0]!.plannedPath).toBe("");
  });

  it("çubuklar HG_BASE çizgisinden yükselir", () => {
    const weeks = [week()];
    const geo = histogramGeometry(weeks, label);
    expect(geo.bars[0]!.plannedPath).toContain(String(HG_BASE));
  });

  it("week_no null olsa da çökmez (etiket üreticiye bırakılır)", () => {
    const weeks = [week({ week_no: null })];
    const geo = histogramGeometry(weeks, label);
    expect(geo.bars[0]!.weekNo).toBeNull();
    expect(geo.xTicks[0]!.label).toBe("H?");
  });
});

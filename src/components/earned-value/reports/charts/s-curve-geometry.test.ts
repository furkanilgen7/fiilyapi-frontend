import { describe, it, expect } from "vitest";

import { sCurveGeometry, S_BASE, S_LEFT, S_RIGHT, S_TOP } from "./s-curve-geometry";
import type { EvPanelReport } from "@/lib/api/models";

type CurvePoint = EvPanelReport["s_curve"][number];

function point(overrides: Partial<CurvePoint> = {}): CurvePoint {
  return { day: "2026-09-24", is_future: false, planned_pct_cum: "50", progress_pct_cum: "45", status: "late", variance: "-5", ...overrides };
}

const label = (day: string) => day.slice(8, 10) + "." + day.slice(5, 7);

describe("sCurveGeometry", () => {
  it("boş dizi → boş geometri (çökmez)", () => {
    const geo = sCurveGeometry([], label);
    expect(geo.points).toEqual([]);
    expect(geo.today).toBeNull();
  });

  it("ilk/son nokta S_LEFT/S_RIGHT'a oturur", () => {
    const points = [point({ day: "2026-09-01" }), point({ day: "2026-09-02" }), point({ day: "2026-09-03" })];
    const geo = sCurveGeometry(points, label);
    expect(geo.points[0]!.x).toBe(S_LEFT);
    expect(geo.points[2]!.x).toBe(S_RIGHT);
  });

  it("%0 → S_BASE, %100 → S_TOP (Y ekseni ters çevrilir)", () => {
    const points = [point({ planned_pct_cum: "0", progress_pct_cum: "0" }), point({ planned_pct_cum: "100", progress_pct_cum: "100", day: "2026-09-25" })];
    const geo = sCurveGeometry(points, label);
    expect(geo.points[0]!.plannedY).toBe(S_BASE);
    expect(geo.points[1]!.plannedY).toBe(S_TOP);
  });

  it("GELECEK gün (is_future=true) → actualY null, gerçek yolun İÇİNDE YOK", () => {
    const points = [
      point({ day: "2026-09-24", is_future: false, progress_pct_cum: "45" }),
      point({ day: "2026-09-25", is_future: true, progress_pct_cum: null }),
    ];
    const geo = sCurveGeometry(points, label);
    expect(geo.points[1]!.actualY).toBeNull();
    // "Bugün" son GERÇEK günden okunur — gelecek günden DEĞİL.
    expect(geo.today?.day).toBe("2026-09-24");
    // Gerçek path yalnız TEK noktadan oluşur (M ile başlar, L YOK).
    expect(geo.actualPath).not.toContain("L");
  });

  it("EŞİTLİK: planlı===gerçek her günde → behind dolgusu BOŞ (ahead sıfır genişlikte de olsa üretilir)", () => {
    const points = [
      point({ day: "2026-09-01", planned_pct_cum: "30", progress_pct_cum: "30" }),
      point({ day: "2026-09-02", planned_pct_cum: "40", progress_pct_cum: "40" }),
    ];
    const geo = sCurveGeometry(points, label);
    expect(geo.fillBehind).toBe("");
  });

  it("KESİŞİM: gerçek önce ÖNDE sonra GERİDE → hem fillAhead hem fillBehind DOLAR", () => {
    const points = [
      point({ day: "2026-09-01", planned_pct_cum: "30", progress_pct_cum: "40" }), // önde
      point({ day: "2026-09-02", planned_pct_cum: "50", progress_pct_cum: "40" }), // geride
    ];
    const geo = sCurveGeometry(points, label);
    expect(geo.fillAhead).not.toBe("");
    expect(geo.fillBehind).not.toBe("");
  });

  it("(b) baseline var, sahadan veri YOK: her gün is_future=false ama HİÇBİRİNİN progress_pct_cum'u yok → 'Bugün' YİNE de SON güne oturur", () => {
    const points = [
      point({ day: "2026-09-22", is_future: false, progress_pct_cum: null }),
      point({ day: "2026-09-23", is_future: false, progress_pct_cum: null }),
      point({ day: "2026-09-24", is_future: false, progress_pct_cum: null }),
    ];
    const geo = sCurveGeometry(points, label);
    expect(geo.today?.day).toBe("2026-09-24");
    expect(geo.today?.actualY).toBeNull();
    expect(geo.actualPath).toBe("");
  });

  it("x ekseni etiketleri ilk/son günü İÇERİR", () => {
    const points = Array.from({ length: 20 }, (_, i) =>
      point({ day: `2026-09-${String(i + 1).padStart(2, "0")}` }),
    );
    const geo = sCurveGeometry(points, label);
    expect(geo.xTicks[0]!.label).toBe(label("2026-09-01"));
    expect(geo.xTicks[geo.xTicks.length - 1]!.label).toBe(label("2026-09-20"));
    expect(geo.xTicks.length).toBeLessThanOrEqual(8);
  });

  it("Y ekseni beş eşit adımlı yüzde etiketi verir", () => {
    const geo = sCurveGeometry([point()], label);
    expect(geo.yTicks.map((t) => t.label)).toEqual(["%0", "%25", "%50", "%75", "%100"]);
  });
});

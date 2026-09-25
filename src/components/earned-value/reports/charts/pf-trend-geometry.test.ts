import { describe, it, expect } from "vitest";

import { pfTrendGeometry, pfBandZones, PF_TOP, PF_BASE } from "./pf-trend-geometry";
import type { EvPanelReport } from "@/lib/api/models";
import type { DailyPfThresholds } from "@/lib/earned-value";

type PfPoint = EvPanelReport["pf_trend"][number];

const THRESHOLDS: DailyPfThresholds = { redBelow: "0.95", greenFrom: "1.00", highAbove: "1.05" };

function point(overrides: Partial<PfPoint> = {}): PfPoint {
  return { day: "2026-09-24", pf_day: "1.04", pf_rolling: "1.02", ...overrides };
}

const label = (day: string) => day.slice(8, 10);

describe("pfBandZones — S14 zemin bandı (GÜNLÜK eşikler)", () => {
  it("üç bant (yeşil/sarı/kırmızı) üretir, ikisi PF_TOP/PF_BASE aralığını kaplar", () => {
    const zones = pfBandZones(THRESHOLDS);
    expect(zones.map((z) => z.color)).toEqual(["green", "amber", "red"]);
    expect(zones[0]!.y).toBe(PF_TOP);
    expect(zones[zones.length - 1]!.y + zones[zones.length - 1]!.height).toBe(PF_BASE);
  });

  it("redBelow === greenFrom ise sarı bant SIFIR yükseklikte, listeden DÜŞER", () => {
    const zones = pfBandZones({ redBelow: "1.00", greenFrom: "1.00", highAbove: "1.05" });
    expect(zones.find((z) => z.color === "amber")).toBeUndefined();
  });
});

describe("pfTrendGeometry", () => {
  it("boş dizi çökmez", () => {
    const geo = pfTrendGeometry([], THRESHOLDS, label);
    expect(geo.points).toEqual([]);
    expect(geo.today).toBeNull();
  });

  it("pf_day null olan gün → nokta y null (nokta basılmaz)", () => {
    const points = [point({ pf_day: null })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label);
    expect(geo.points[0]!.y).toBeNull();
  });

  it("pf_rolling zincirinde eksik gün varsa 7 gün ort. çizgisi o noktayı ATLAR, kırılmaz", () => {
    const points = [point({ day: "2026-09-22", pf_rolling: "1.0" }), point({ day: "2026-09-23", pf_rolling: null }), point({ day: "2026-09-24", pf_rolling: "1.02" })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label);
    // yalnız İKİ bilinen nokta path'e girer (M...L...), ORTADAKİ eksik nokta yok.
    expect((geo.rollingPath.match(/[ML]/g) ?? []).length).toBe(2);
  });

  it("Y 0,80–1,20 KIRPILIR: aralık dışı pf_day değerleri sınırdaki y'ye oturur", () => {
    const high = pfTrendGeometry([point({ pf_day: "1.5" })], THRESHOLDS, label);
    const atMax = pfTrendGeometry([point({ pf_day: "1.2" })], THRESHOLDS, label);
    expect(high.points[0]!.y).toBe(atMax.points[0]!.y);
  });

  it("today SON günü verir (dizinin sonu — is_future filtresi PF trendinde YOK, backend zaten kırpar)", () => {
    const points = [point({ day: "2026-09-23" }), point({ day: "2026-09-24", pf_day: "1.10", pf_rolling: "1.05" })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label);
    expect(geo.today?.day).toBe("2026-09-24");
    expect(geo.today?.rolling).toBe(1.05);
  });
});

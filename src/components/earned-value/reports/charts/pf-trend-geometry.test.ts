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
/** Fikstürlerin çoğunda `point()`un varsayılan günü — "bugün" ÇAPASI. */
const REPORT_DAY = "2026-09-24";

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
    const geo = pfTrendGeometry([], THRESHOLDS, label, REPORT_DAY);
    expect(geo.points).toEqual([]);
    expect(geo.today).toBeNull();
  });

  it("pf_day null olan gün → nokta y null (nokta basılmaz)", () => {
    const points = [point({ pf_day: null })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
    expect(geo.points[0]!.y).toBeNull();
  });

  it("pf_rolling zincirinde eksik gün varsa 7 gün ort. çizgisi o noktayı ATLAR, kırılmaz", () => {
    const points = [point({ day: "2026-09-22", pf_rolling: "1.0" }), point({ day: "2026-09-23", pf_rolling: null }), point({ day: "2026-09-24", pf_rolling: "1.02" })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
    // yalnız İKİ bilinen nokta path'e girer (M...L...), ORTADAKİ eksik nokta yok.
    expect((geo.rollingPath.match(/[ML]/g) ?? []).length).toBe(2);
  });

  it("Y 0,80–1,20 KIRPILIR: aralık dışı pf_day değerleri sınırdaki y'ye oturur", () => {
    const high = pfTrendGeometry([point({ pf_day: "1.5" })], THRESHOLDS, label, REPORT_DAY);
    const atMax = pfTrendGeometry([point({ pf_day: "1.2" })], THRESHOLDS, label, REPORT_DAY);
    expect(high.points[0]!.y).toBe(atMax.points[0]!.y);
  });

  it("today rapor gününe oturur (dizinin SONU değil GEREKMEZ)", () => {
    const points = [point({ day: "2026-09-23" }), point({ day: "2026-09-24", pf_day: "1.10", pf_rolling: "1.05" })];
    const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
    expect(geo.today?.day).toBe("2026-09-24");
    expect(geo.today?.rolling).toBe(1.05);
  });

  /**
   * 🔴 LİDER DENETİMİ KUSURU (P2, 2026-09-26, CEO yan yana ölçümü) — dizi
   * GELECEĞE uzanıyorsa (S-eğrisi/GİR ile AYNI pencere) "today" ÖNCEDEN
   * dizinin SON elemanıydı — bir gelecek günü "Bugün" diye basıyordu.
   * `reportDay` ÇAPASI eklendi: `day > reportDay` → GELECEK.
   */
  describe("gelecek günler (day > reportDay) — S32/P2 mockup ölçümü", () => {
    const points = [
      point({ day: "2026-09-23", pf_day: "1.10", pf_rolling: "1.08" }),
      point({ day: "2026-09-24", pf_day: "1.09", pf_rolling: "1.06" }), // rapor günü
      point({ day: "2026-09-25", pf_day: "1.20", pf_rolling: "1.10" }), // GELECEK
      point({ day: "2026-09-26", pf_day: null, pf_rolling: null }), // GELECEK, veri zaten yok
    ];

    it("'today' dizinin SONU DEĞİL, reportDay'e eşit son nokta", () => {
      const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
      expect(geo.today?.day).toBe("2026-09-24");
      expect(geo.today?.index).toBe(1);
    });

    it("gelecek güne AİT nokta y=null (pf_day dolu olsa BİLE çizilmez)", () => {
      const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
      expect(geo.points[2]!.y).toBeNull(); // 09-25, pf_day="1.20" ama GELECEK
      expect(geo.points[0]!.y).not.toBeNull(); // 09-23, geçmiş — normal basılır
    });

    it("gelecek günün pf_rolling'i ort. çizgisine GİRMEZ", () => {
      const geo = pfTrendGeometry(points, THRESHOLDS, label, REPORT_DAY);
      // 3 geçmiş/bugün noktadan yalnız 2'si pf_rolling dolu (09-23, 09-24); 09-25/09-26 elenir.
      expect((geo.rollingPath.match(/[ML]/g) ?? []).length).toBe(2);
    });
  });

  /**
   * 🔴 LİDER DENETİMİ KUSURU (P2) — X ekseninin SON tık'ı `PF_RIGHT`e
   * (viewBox kenarına) oturur; `"middle"` hizası metnin yarısını KIRPTIRIR.
   */
  it("SON x-tik 'end' hizalanır (kırpılmasın), diğerleri 'middle' kalır", () => {
    const points = Array.from({ length: 10 }, (_, i) => point({ day: `2026-09-${String(i + 15).padStart(2, "0")}` }));
    const geo = pfTrendGeometry(points, THRESHOLDS, label, "2026-09-24");
    expect(geo.xTicks[geo.xTicks.length - 1]!.align).toBe("end");
    expect(geo.xTicks[0]!.align).toBe("middle");
  });
});

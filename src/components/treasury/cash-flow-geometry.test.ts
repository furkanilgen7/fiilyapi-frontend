import { describe, it, expect } from "vitest";

import type { CashFlowBucket } from "@/lib/api/hooks/useCashFlow";

import {
  buildCashFlowGeometry,
  CHART_BASELINE,
  CHART_FILL_BOTTOM,
  CHART_TOP,
  CHART_WIDTH,
  dayOfMonth,
  daysInMonth,
  scaleX,
  scaleY,
  toAreaPath,
  toLinePath,
} from "./cash-flow-geometry";

/** Yoldan tüm sayıları söker — koordinatların tam sayılığını denetlemek için. */
function numbersIn(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe("dayOfMonth / daysInMonth", () => {
  it("ISO tarihinden ayın gününü STRING'ten ayrıştırır (UTC kayması yok)", () => {
    expect(dayOfMonth("2026-07-01")).toBe(1);
    expect(dayOfMonth("2026-07-19")).toBe(19);
    expect(dayOfMonth("2026-12-31")).toBe(31);
  });

  it("ay uzunluğunu doğru verir (artık yıl dahil)", () => {
    expect(daysInMonth(2026, 7)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });
});

describe("scaleX — x ekseni AYIN GÜNLERİ üzerinden", () => {
  it("ayın ilk günü 0, son günü genişliğin tamamı", () => {
    expect(scaleX(1, 31)).toBe(0);
    expect(scaleX(31, 31)).toBe(CHART_WIDTH);
  });

  it("ortadaki gün orantılı ve TAM SAYI konumlanır", () => {
    // (16-1)/(31-1) * 400 = 200
    expect(scaleX(16, 31)).toBe(200);
    // (19-1)/(31-1) * 400 = 240
    expect(scaleX(19, 31)).toBe(240);
    // Kesirli çıkan bir gün: (5-1)/(30-1) * 400 = 55,17...
    expect(scaleX(5, 30)).toBe(55);
    expect(Number.isInteger(scaleX(5, 30))).toBe(true);
  });
});

describe("scaleY — ORTAK tavan, taban çizgisi", () => {
  it("tavan değeri üste, sıfır tabana oturur", () => {
    expect(scaleY(100, 100)).toBe(CHART_TOP);
    expect(scaleY(0, 100)).toBe(CHART_BASELINE);
  });

  it("tavan 0 ise her şey taban çizgisindedir (0'a bölme yok)", () => {
    expect(scaleY(0, 0)).toBe(CHART_BASELINE);
  });

  it("kesirli oran TAM SAYIya yuvarlanır", () => {
    // 100 - (1/3)*80 = 73,33...
    expect(scaleY(1, 3)).toBe(73);
    expect(Number.isInteger(scaleY(1, 3))).toBe(true);
  });
});

describe("buildCashFlowGeometry — E9:92-101", () => {
  const SERIES: CashFlowBucket[] = [
    { day: "2026-07-01", inflow: "100000.00", outflow: "40000.00" },
    { day: "2026-07-11", inflow: "250000.00", outflow: "310000.00" },
    { day: "2026-07-31", inflow: "500000.00", outflow: "120000.00" },
  ];

  it("iki eğriyi ORTAK tavana göre ölçekler (karşılaştırılabilir kalsın)", () => {
    // Arrange + Act
    const geo = buildCashFlowGeometry(SERIES, 2026, 7);
    // Assert — ortak tavan 500000 (giriş); hiçbir çıkış noktası tepeye oturmaz.
    expect(geo.inflowPoints[2]?.y).toBe(CHART_TOP);
    expect(geo.outflowPoints.every((point) => point.y > CHART_TOP)).toBe(true);
    // Çıkışın en büyüğü (310000/500000) tavanın altındadır: 100-0,62*80 = 50,4 → 50
    expect(geo.outflowPoints[1]?.y).toBe(50);
  });

  it("x ekseni seyrek seriyi AYIN GÜNLERİNE yayar, dizinin indeksine DEĞİL", () => {
    const geo = buildCashFlowGeometry(SERIES, 2026, 7);
    // 1. gün → 0 · 11. gün → (10/30)*400 = 133 · 31. gün → 400
    expect(geo.inflowPoints.map((point) => point.x)).toEqual([0, 133, CHART_WIDTH]);
    // İndeks bazlı olsaydı orta nokta 200 olurdu.
    expect(geo.inflowPoints[1]?.x).not.toBe(200);
  });

  it("🔴 üretilen HER koordinat TAM SAYIdır (kesirli koordinat baseline'ı oynatır)", () => {
    // Kesirli koordinat üretmeye ZORLAYAN seri: 30 günlük ay + asal değerler.
    const awkward: CashFlowBucket[] = [
      { day: "2026-04-03", inflow: "37.00", outflow: "11.00" },
      { day: "2026-04-07", inflow: "101.00", outflow: "53.00" },
      { day: "2026-04-23", inflow: "7.00", outflow: "97.00" },
    ];
    const geo = buildCashFlowGeometry(awkward, 2026, 4);

    for (const path of [geo.inflowLine, geo.inflowArea, geo.outflowLine, geo.outflowArea]) {
      expect(path).not.toBe("");
      for (const value of numbersIn(path)) {
        expect(Number.isInteger(value), `${path} içinde kesirli koordinat var: ${value}`).toBe(
          true,
        );
      }
    }
    for (const point of [...geo.inflowPoints, ...geo.outflowPoints]) {
      expect(Number.isInteger(point.x)).toBe(true);
      expect(Number.isInteger(point.y)).toBe(true);
    }
  });

  it("dolgu yolu taban çizgisine kapanır (E9:97/99)", () => {
    const geo = buildCashFlowGeometry(SERIES, 2026, 7);
    expect(geo.inflowArea.startsWith(`M0,${CHART_FILL_BOTTOM}`)).toBe(true);
    expect(geo.inflowArea.endsWith(`L${CHART_WIDTH},${CHART_FILL_BOTTOM}Z`)).toBe(true);
  });

  it("çizgi yolu her noktadan geçer", () => {
    const geo = buildCashFlowGeometry(SERIES, 2026, 7);
    expect(geo.inflowLine).toBe(
      geo.inflowPoints
        .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
        .join(""),
    );
  });
});

describe("boş / tek noktalı seri", () => {
  it("boş seri boş yol üretir — sessiz bozuk SVG basılmaz", () => {
    const geo = buildCashFlowGeometry([], 2026, 7);
    expect(geo.inflowLine).toBe("");
    expect(geo.inflowArea).toBe("");
    expect(geo.outflowLine).toBe("");
    expect(geo.outflowArea).toBe("");
  });

  it("tek noktalı seri görünür bir işaret üretir (nokta olarak basılır)", () => {
    const geo = buildCashFlowGeometry(
      [{ day: "2026-07-10", inflow: "5000.00", outflow: "0.00" }],
      2026,
      7,
    );
    expect(geo.inflowLine).toBe("M120,20L120,20");
    expect(toLinePath([])).toBe("");
    expect(toAreaPath([])).toBe("");
  });

  it("hareketsiz ay (tüm değerler 0) taban çizgisinde düz çizgi verir", () => {
    const geo = buildCashFlowGeometry(
      [
        { day: "2026-07-01", inflow: "0.00", outflow: "0.00" },
        { day: "2026-07-31", inflow: "0.00", outflow: "0.00" },
      ],
      2026,
      7,
    );
    expect(geo.inflowLine).toBe(`M0,${CHART_BASELINE}L${CHART_WIDTH},${CHART_BASELINE}`);
  });
});

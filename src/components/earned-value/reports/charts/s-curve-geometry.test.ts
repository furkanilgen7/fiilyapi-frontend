import { describe, it, expect } from "vitest";

import { sCurveGeometry, S_BASE, S_LEFT, S_RIGHT, S_TOP } from "./s-curve-geometry";
import type { EvPanelReport } from "@/lib/api/models";

type CurvePoint = EvPanelReport["s_curve"][number];

/**
 * 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU — bu dosyanın TÜM fikstürleri ÖNCEDEN
 * `planned_pct_cum: "50"` gibi 0–100 YÜZDE birimi değerler kullanıyordu; API
 * sözleşmesi (`PanelRow`/KPI alanlarıyla AYNI proje çapında kural) bu alanı
 * 0–1 KESİR olarak taşır ("0.5" = %50). Testler YANLIŞ birimle YAZILDIĞI
 * için `num()`teki eksik `×100` dönüşümünü YAKALAMADI — hem üretici KOD hem
 * TEST verisi AYNI (yanlış) varsayımı paylaşıyordu. Tüm değerler 0–1 kesre
 * çevrildi; aşağıdaki YENİ "eksen hizası" testi asıl regresyon bekçisidir.
 */
function point(overrides: Partial<CurvePoint> = {}): CurvePoint {
  return { day: "2026-09-24", is_future: false, planned_pct_cum: "0.5", progress_pct_cum: "0.45", status: "late", variance: "-0.05", ...overrides };
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

  it("%0 (kesir '0') → S_BASE, %100 (kesir '1') → S_TOP (Y ekseni ters çevrilir)", () => {
    const points = [point({ planned_pct_cum: "0", progress_pct_cum: "0" }), point({ planned_pct_cum: "1", progress_pct_cum: "1", day: "2026-09-25" })];
    const geo = sCurveGeometry(points, label);
    expect(geo.points[0]!.plannedY).toBe(S_BASE);
    expect(geo.points[1]!.plannedY).toBe(S_TOP);
  });

  /**
   * 🔴 LİDER TALEBİ — "değer %48,5 ise y, eksenin %48,5 hizasında olmalı"
   * özellik testi: birkaç kesir/yüzde çifti için y'nin `valueScale`in
   * (S_TOP..S_BASE) DOĞRUSAL karşılığında olduğunu doğrudan hesaplar —
   * sabit bir beklenen piksel YAZILMAZ, ORANTI sınanır (uygulanan ölçek
   * değişse de test anlamını korur).
   */
  it("Y ekseni HİZASI: kesir değeri × eksen boyu ORANINA denk gelir (48,5% dahil)", () => {
    const axisHeight = S_BASE - S_TOP;
    const cases: readonly [string, number][] = [
      ["0.485", 0.485], // %48,5 — mockup'taki gerçek değer
      ["0.25", 0.25],
      ["0.75", 0.75],
      ["0.1", 0.1],
    ];
    for (const [fraction, ratio] of cases) {
      const geo = sCurveGeometry([point({ planned_pct_cum: fraction, progress_pct_cum: fraction })], label);
      // `valueScale` TAM PİKSELE yuvarlar (görsel kapı kuralı) — beklenen
      // değer de AYNI yuvarlamadan geçirilir, yoksa 122,15 ↔ 122 gibi
      // yuvarlama farkları sahte-kırmızı üretir.
      const expectedY = Math.round(S_BASE - ratio * axisHeight);
      expect(geo.points[0]!.plannedY, `kesir ${fraction}`).toBe(expectedY);
      expect(geo.points[0]!.actualY, `kesir ${fraction}`).toBe(expectedY);
    }
  });

  it("GELECEK gün (is_future=true) → actualY null, gerçek yolun İÇİNDE YOK", () => {
    const points = [
      point({ day: "2026-09-24", is_future: false, progress_pct_cum: "0.45" }),
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
      point({ day: "2026-09-01", planned_pct_cum: "0.3", progress_pct_cum: "0.3" }),
      point({ day: "2026-09-02", planned_pct_cum: "0.4", progress_pct_cum: "0.4" }),
    ];
    const geo = sCurveGeometry(points, label);
    expect(geo.fillBehind).toBe("");
  });

  it("KESİŞİM: gerçek önce ÖNDE sonra GERİDE → hem fillAhead hem fillBehind DOLAR", () => {
    const points = [
      point({ day: "2026-09-01", planned_pct_cum: "0.3", progress_pct_cum: "0.4" }), // önde
      point({ day: "2026-09-02", planned_pct_cum: "0.5", progress_pct_cum: "0.4" }), // geride
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

  /**
   * LİDER TALEBİ (2026-09-26) — mockup Panel.dc.html:537-539 `ymin`/`ymax`
   * kuralı: `range !== 'all'` iken eksen İLK/SON noktaya göre 5'in katına
   * yuvarlanarak DARALIR; `range === 'all'`da SABİT 0–100 kalır. `4w`/`3m`
   * ayrımı yapılmaz (mockup'ta da ikisi AYNI dalı kullanır — tek KOŞUL
   * `range !== 'all'`), o yüzden `4w` ile temsil edilir.
   */
  describe("Y ekseni DİNAMİK daralması (S32, mockup Panel:537-539)", () => {
    it("4w: eksen ilk/son noktaya göre 5'in katına yuvarlanarak DARALIR — ilk nokta S_BASE'e, son nokta S_TOP'a oturur", () => {
      const points = [
        point({ day: "2026-09-01", planned_pct_cum: "0.30", progress_pct_cum: "0.30" }),
        point({ day: "2026-09-02", planned_pct_cum: "0.45", progress_pct_cum: "0.40" }),
        point({ day: "2026-09-03", planned_pct_cum: "0.60", progress_pct_cum: "0.55" }),
      ];
      const geo = sCurveGeometry(points, label, "4w");
      // ymin = floor(min(30,30)/5)*5 = 30 → ilk nokta değeri (30) TAM ymin'de.
      expect(geo.points[0]!.plannedY).toBe(S_BASE);
      // ymax = ceil(60/5)*5 = 60 → son nokta değeri (60) TAM ymax'ta.
      expect(geo.points[2]!.plannedY).toBe(S_TOP);
      expect(geo.yTicks.map((t) => t.label)).toEqual(["%30", "%38", "%45", "%53", "%60"]);
    });

    it("all: AYNI noktalarla eksen SABİT 0–100 kalır — ilk nokta S_BASE'e OTURMAZ (mockup'ın 'tüm süre' özel durumu)", () => {
      const points = [
        point({ day: "2026-09-01", planned_pct_cum: "0.30", progress_pct_cum: "0.30" }),
        point({ day: "2026-09-02", planned_pct_cum: "0.60", progress_pct_cum: "0.55" }),
      ];
      const geo = sCurveGeometry(points, label, "all");
      expect(geo.points[0]!.plannedY).not.toBe(S_BASE);
      expect(geo.yTicks.map((t) => t.label)).toEqual(["%0", "%25", "%50", "%75", "%100"]);
    });

    it("range VERİLMEZSE varsayılan 'all' — davranış DEĞİŞMEDİ (geriye uyumlu)", () => {
      const points = [point({ planned_pct_cum: "0.3", progress_pct_cum: "0.3" })];
      expect(sCurveGeometry(points, label).yTicks.map((t) => t.label)).toEqual(sCurveGeometry(points, label, "all").yTicks.map((t) => t.label));
    });

    it("ilk nokta gerçek YOK (progress_pct_cum null) → ymin PLANLI değerden türetilir (uydurma sınır YOK)", () => {
      const points = [
        point({ day: "2026-09-01", planned_pct_cum: "0.40", progress_pct_cum: null, is_future: false }),
        point({ day: "2026-09-02", planned_pct_cum: "0.60", progress_pct_cum: "0.55" }),
      ];
      const geo = sCurveGeometry(points, label, "4w");
      // ymin = floor(min(40,40)/5)*5 = 40 (actual YOK → planlı ile AYNI kabul edilir).
      expect(geo.points[0]!.plannedY).toBe(S_BASE);
    });

    it("sınır noktasında planned_pct_cum null → SABİT 0–100'e DÜŞER (dinamik eksen VERİ İSTER)", () => {
      const points = [
        point({ day: "2026-09-01", planned_pct_cum: null, progress_pct_cum: null }),
        point({ day: "2026-09-02", planned_pct_cum: "0.60", progress_pct_cum: "0.55" }),
      ];
      const geo = sCurveGeometry(points, label, "4w");
      expect(geo.yTicks.map((t) => t.label)).toEqual(["%0", "%25", "%50", "%75", "%100"]);
    });
  });
});

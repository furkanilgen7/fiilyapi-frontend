import { describe, it, expect } from "vitest";

import { pfBandDescription, progressBarWidth, varianceTone } from "./panel-kpi-format";

/**
 * 🔴 FIX-F1 Kusur 1 — backend `progress_pct_cum` 0–1 KESİRdir
 * (`app/modules/earned_value/engine/metrics.py` / `schemas_reports.py:190…`),
 * fikstür `panel-fixtures.ts:161` "0.458856" örneğiyle BİREBİR. Girdi KESİR,
 * çıktı 0–100 YÜZDE (çubuk genişliği).
 */
describe("progressBarWidth", () => {
  it("null → 0", () => {
    expect(progressBarWidth(null)).toBe(0);
  });

  it("backend kesri (0.458856) → 46 (yarım-yukarı)", () => {
    expect(progressBarWidth("0.458856")).toBe(46);
  });

  it("0'ın ALTI 0'a KIRPILIR", () => {
    expect(progressBarWidth("-0.05")).toBe(0);
  });

  it("1'in ÜSTÜ 100'e KIRPILIR (aşım kalemi çubuğu taşmaz)", () => {
    expect(progressBarWidth("1.427")).toBe(100);
  });

  it("tam sınırlar (0, 1) DEĞİŞMEZ", () => {
    expect(progressBarWidth("0")).toBe(0);
    expect(progressBarWidth("1")).toBe(100);
  });
});

/**
 * PLN-F3.6b LİDER PLANI §1.1 · KPI 2/3'ün alt satırı — mockup `pfc()`
 * metniyle BİREBİR ("Sarı bant · 0,95–1,00" vb.), eşikler `pf_bands`ten.
 */
describe("pfBandDescription", () => {
  const RANGE = { redBelow: "0.95", greenFrom: "1.00" };

  it("red → 'Kırmızı bant · < eşik'", () => {
    expect(pfBandDescription("red", RANGE)).toBe("Kırmızı bant · < 0,95");
  });

  it("amber → 'Sarı bant · alt–üst'", () => {
    expect(pfBandDescription("amber", RANGE)).toBe("Sarı bant · 0,95–1,00");
  });

  it("green → 'Yeşil bant · eşik ve üstü'", () => {
    expect(pfBandDescription("green", RANGE)).toBe("Yeşil bant · 1,00 ve üstü");
  });

  it("none/high → null (üst kademe küm./hafta PF ayarında TANIMSIZ, uydurma metin YOK)", () => {
    expect(pfBandDescription("none", RANGE)).toBeNull();
    expect(pfBandDescription("high", RANGE)).toBeNull();
  });
});

/**
 * LİDER DENETİMİ KUSURU (Panel ana kare, 2. tur) — mockup `devFg` eşiği ±2
 * PUANDIR (Panel.dc.html:513/524), SIFIR DEĞİL. KPI 1 + disiplin tablosunun
 * "Sapma" kolonu AYNI fonksiyonu paylaşır.
 */
describe("varianceTone", () => {
  it("null → 'neutral'", () => {
    expect(varianceTone(null)).toBe("neutral");
  });

  it("−0,026 (−2,6 puan, mockup'taki KPI 1 değeri) → 'negative'", () => {
    expect(varianceTone("-0.026038")).toBe("negative");
  });

  it("tam −0,02 (−2,0 puan) SINIRDA → 'neutral' (eşik SIKI < , sınır dahil DEĞİL)", () => {
    expect(varianceTone("-0.02")).toBe("neutral");
  });

  it("−0,021 (−2,1 puan) eşiği GEÇER → 'negative'", () => {
    expect(varianceTone("-0.021")).toBe("negative");
  });

  it("+0,021 (+2,1 puan) eşiği GEÇER → 'positive'", () => {
    expect(varianceTone("0.021")).toBe("positive");
  });

  it("±2 puan ARASI (ör. −0,019, +0,016) → 'neutral' (SIFIR eşiği DEĞİL — önceki kusur)", () => {
    expect(varianceTone("-0.019")).toBe("neutral");
    expect(varianceTone("0.016")).toBe("neutral");
  });
});

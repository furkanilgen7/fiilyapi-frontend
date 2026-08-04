import { describe, it, expect } from "vitest";

import { computeDiarySummaryKpis, clampWidthPct } from "./summary-kpis";
import type { DiaryAccrual } from "./payment-accrual";

// F-SD T4 · "Hakediş Özeti" KPI türevleri. Korkuluk: kaynak pending ise sayı
// UYDURULMAZ; payda yoksa oran BASILMAZ.

const healthyAccrual: DiaryAccrual = {
  employerTotal: "2100000.00",
  employerPendingReason: null,
  subcontractorRows: [
    { name: "Akın İnşaat", grossTotal: "640000.00" },
    { name: "Yılmaz Elektrik", grossTotal: "320000.00" },
    { name: "Kardeş Su", grossTotal: "200000.00" },
  ],
  subcontractorPendingReason: null,
  grossProfit: "940000.00",
};

function kpisOf(accrual: DiaryAccrual, overrides: Partial<Parameters<typeof computeDiarySummaryKpis>[0]> = {}) {
  return computeDiarySummaryKpis({
    accrual,
    contractAmount: "11200000.00",
    cumulativeGross: "8400000.00",
    progressPct: "75.00",
    isSummaryLoading: false,
    isSummaryError: false,
    ...overrides,
  });
}

describe("computeDiarySummaryKpis", () => {
  it("aylık taşeron toplamını satırlardan kuruş hassasiyetiyle toplar", () => {
    const kpis = kpisOf(healthyAccrual);
    expect(kpis.subcontractorTotal).toBe("1160000.00");
    expect(kpis.subcontractorCount).toBe(3);
  });

  it("işveren tutarının sözleşme bedeline oranını hesaplar (HÖ103)", () => {
    const kpis = kpisOf(healthyAccrual);
    expect(kpis.employerContractSharePct).toBe("18.75");
    expect(kpis.employerContractShareReason).toBeNull();
  });

  it("taşeron payını ve brüt marjı hesaplar (HÖ108, HÖ113)", () => {
    const kpis = kpisOf(healthyAccrual);
    expect(kpis.subcontractorSharePct).toBe("55.24");
    expect(kpis.grossMarginPct).toBe("44.76");
  });

  it("çubuk genişliklerini işveren tutarına oranlar (HÖ194)", () => {
    const kpis = kpisOf(healthyAccrual);
    expect(kpis.subcontractorBars.map((bar) => Math.round(bar.widthPct))).toEqual([30, 15, 10]);
  });

  it("taşeron tarafı pending ise toplam/marj/çubuk BASILMAZ", () => {
    const kpis = kpisOf({
      ...healthyAccrual,
      subcontractorRows: null,
      subcontractorPendingReason: "Liste eksik.",
      grossProfit: null,
    });
    expect(kpis.subcontractorTotal).toBeNull();
    expect(kpis.subcontractorCount).toBeNull();
    expect(kpis.grossMarginPct).toBeNull();
    expect(kpis.grossProfit).toBeNull();
    expect(kpis.subcontractorBars).toEqual([]);
    expect(kpis.profitFormula).toBeNull();
  });

  it("sözleşme bedeli yoksa oran yerine GÖRÜNÜR gerekçe verir", () => {
    const kpis = kpisOf(healthyAccrual, { contractAmount: null });
    expect(kpis.employerContractSharePct).toBeNull();
    expect(kpis.employerContractShareReason).toMatch(/sözleşme bedeli/i);
  });

  it("işveren tutarı sıfırsa oranlar sıfıra bölünmez", () => {
    const kpis = kpisOf({ ...healthyAccrual, employerTotal: "0.00" });
    expect(kpis.subcontractorSharePct).toBeNull();
    expect(kpis.grossMarginPct).toBeNull();
    expect(kpis.subcontractorBars.every((bar) => bar.widthPct === 0)).toBe(true);
  });

  it("özet ucu hata verirse kümülatif tutar sessizce sıfırlanmaz", () => {
    const kpis = kpisOf(healthyAccrual, { isSummaryError: true });
    expect(kpis.cumulativeGross).toBeNull();
    expect(kpis.cumulativeProgressPct).toBeNull();
    expect(kpis.cumulativeWidthPct).toBe(0);
    expect(kpis.cumulativePendingReason).toMatch(/yüklenemedi/i);
  });

  it("kümülatif ilerleme çubuğunu backend yüzdesinden kurar (HÖ119)", () => {
    const kpis = kpisOf(healthyAccrual);
    expect(kpis.cumulativeGross).toBe("8400000.00");
    expect(kpis.cumulativeWidthPct).toBe(75);
  });
});

describe("clampWidthPct", () => {
  it("0-100 aralığına kırpar ve geçersiz değeri 0 yapar", () => {
    expect(clampWidthPct("140")).toBe(100);
    expect(clampWidthPct("-3")).toBe(0);
    expect(clampWidthPct("abc")).toBe(0);
    expect(clampWidthPct(null)).toBe(0);
    expect(clampWidthPct("42.5")).toBe(42.5);
  });
});

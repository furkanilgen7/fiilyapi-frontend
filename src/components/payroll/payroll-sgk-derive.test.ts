import { describe, expect, it } from "vitest";

import type { PayrollSgkSummaryResponse } from "@/lib/api/hooks/usePayrollSgk";

import { sgkEmployeeRows, sgkEmployerRows, submittedDate } from "./payroll-sgk-derive";
import { SGK_ROW_SGK_EMPLOYER, SGK_ROW_UNEMPLOYMENT_EMPLOYER } from "./payroll-sgk-labels";

/**
 * 🔴 K4 — MOCKUP ARİTMETİĞİ BOZUK, fikstür KOPYALAMAZ: SGK:80-82 üç işveren
 * kalemi 152.356 + 14.864 + 7.432 = 174.652 eder ama SGK:83 toplamı 148.800
 * yazar. Buradaki fikstür KENDİ İÇİNDE tutarlıdır: işveren toplamı ÜÇ kalemin
 * (kısa çalışma DAHİL) toplamıdır — çünkü sunucu da öyle üretir; ekranın
 * görevi bu toplamı OLDUĞU GİBİ basmaktır, düzeltmek değil (K2).
 */
function summary(
  overrides: Partial<PayrollSgkSummaryResponse> = {},
): PayrollSgkSummaryResponse {
  return {
    period_id: "period-7",
    year: 2026,
    month: 7,
    sgk_submitted_at: null,
    declared_personnel_count: 48, // SGK:55
    sgk_base_total: "743200.00", // SGK:56
    sgk_premium_total: "256404.00",
    unemployment_total: "22296.00", // SGK:58
    sgk_employee_total: "104048.00", // SGK:70
    unemployment_employee_total: "7432.00", // SGK:71
    income_tax_total: "74320.00", // SGK:72
    stamp_tax_total: "5641.00", // SGK:73
    employee_deduction_total: "191441.00", // SGK:74 — dört kalemin toplamı
    sgk_employer_total: "152356.00", // SGK:80
    unemployment_employer_total: "14864.00", // SGK:81
    short_work_total: "7432.00", // SGK:82 — 🔴 EKRANDA ÇİZİLMEZ
    employer_burden_total: "174652.00", // ÜÇ kalemin toplamı (kısa çalışma DAHİL)
    sgk_payable_total: "278700.00",
    uncomputed_count: 0,
    unknown_rate_count: 0,
    unknown_tax_count: 0,
    ...overrides,
  };
}

describe("sgkEmployeeRows", () => {
  it("SGK:70-73 dört işçi kalemini sırayla döndürür", () => {
    const rows = sgkEmployeeRows(summary());
    expect(rows.map((row) => row.amount)).toEqual([
      "104048.00",
      "7432.00",
      "74320.00",
      "5641.00",
    ]);
  });

  it("etiketlerde YÜZDE yazmaz — uç oran değil TUTAR döndürür", () => {
    const labels = sgkEmployeeRows(summary()).map((row) => row.label);
    expect(labels.some((label) => label.includes("%"))).toBe(false);
  });
});

describe("sgkEmployerRows — 🔴 K2 kör bekçisi", () => {
  it("SGK:80-81 iki işveren kalemini döndürür", () => {
    const rows = sgkEmployerRows(summary());
    expect(rows.map((row) => row.label)).toEqual([
      SGK_ROW_SGK_EMPLOYER,
      SGK_ROW_UNEMPLOYMENT_EMPLOYER,
    ]);
  });

  /**
   * 🔴 MUTASYON BEKÇİSİ: SGK:82 `Kısa Çalışma Ödeneği (%1)` satırı ASLA
   * çizilmez. Biri ileride "eksik kalem" sanıp eklerse bu iddia KIRILIR.
   */
  it("kısa çalışma ödeneği satırı YOKTUR", () => {
    const rows = sgkEmployerRows(summary());
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.amount === "7432.00")).toBe(false);
    expect(rows.some((row) => row.label.includes("Kısa Çalışma"))).toBe(false);
  });

  /**
   * 🔴 MUTASYON BEKÇİSİ: türetme `short_work_total`ı OKUMAZ. Alan değişse bile
   * dönen satırlar aynı kalır — istemci sunucunun sayılarıyla oynamaz.
   */
  it("`short_work_total` değişse bile satırlar değişmez", () => {
    const before = sgkEmployerRows(summary());
    const after = sgkEmployerRows(summary({ short_work_total: "999999.00" }));
    expect(after).toEqual(before);
  });
});

describe("submittedDate", () => {
  it("zaman damgasından yalnız günü alır (yerel saat kaydırması yok)", () => {
    expect(submittedDate("2026-07-18T21:45:00Z")).toBe("2026-07-18");
  });
});

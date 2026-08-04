import { describe, it, expect } from "vitest";

import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";
import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import type { ListTruncation } from "@/lib/list-truncation";

import { computeDiaryAccrual, type DiaryAccrualInput } from "./payment-accrual";

// F-SD T6 · T3'ün "Aylık Hakediş Birikimi" türevi (GK387-413). KORKULUK
// odaklı: kaynak yüklenirken/hatalıyken/KIRPILMIŞKEN sayı BASILMAZ, görünür
// gerekçe döner.

const NO_TRUNCATION: ListTruncation = { isTruncated: false, shownCount: 2, totalCount: 2 };

function employer(overrides: Partial<ProgressPaymentListItem> = {}): ProgressPaymentListItem {
  return {
    id: "pp-1",
    project_id: "p-1",
    project_name: "Güneşkent",
    sequence_no: 5,
    period_year: 2026,
    period_month: 7,
    description: null,
    status: "approved",
    gross_total: "2100000.00",
    net_total: "2000000.00",
    ...overrides,
  } as ProgressPaymentListItem;
}

function subcontractor(
  overrides: Partial<SiteSubcontractorPaymentItem> = {},
): SiteSubcontractorPaymentItem {
  return {
    id: "scpp-1",
    contractId: "sc-1",
    subcontractorName: "Akın İnşaat",
    sequenceNo: 1,
    periodYear: 2026,
    periodMonth: 7,
    workCategory: "Betonarme İşleri",
    sectionId: null,
    grossTotal: "640000.00",
    netTotal: "600000.00",
    status: "approved",
    isRevisionRequired: false,
    ...overrides,
  } as SiteSubcontractorPaymentItem;
}

function input(overrides: Partial<DiaryAccrualInput> = {}): DiaryAccrualInput {
  return {
    employerItems: [employer()],
    isEmployerLoading: false,
    isEmployerError: false,
    subcontractorItems: [subcontractor()],
    isSubcontractorLoading: false,
    isSubcontractorError: false,
    subcontractorTruncation: NO_TRUNCATION,
    year: 2026,
    month: 7,
    ...overrides,
  };
}

describe("computeDiaryAccrual", () => {
  it("ayın işveren toplamını, taşeron satırlarını ve brüt kârı üretir", () => {
    const accrual = computeDiaryAccrual(input());

    expect(accrual.employerTotal).toBe("2100000.00");
    expect(accrual.subcontractorRows).toEqual([{ name: "Akın İnşaat", grossTotal: "640000.00" }]);
    expect(accrual.grossProfit).toBe("1460000.00");
    expect(accrual.employerPendingReason).toBeNull();
    expect(accrual.subcontractorPendingReason).toBeNull();
  });

  it("BAŞKA aya ait kayıtları toplamdan dışlar", () => {
    const accrual = computeDiaryAccrual(
      input({
        employerItems: [employer(), employer({ id: "pp-2", period_month: 6 })],
        subcontractorItems: [
          subcontractor(),
          subcontractor({ id: "scpp-2", periodMonth: 6, grossTotal: "999999.00" }),
        ],
      }),
    );

    expect(accrual.employerTotal).toBe("2100000.00");
    expect(accrual.subcontractorRows).toEqual([{ name: "Akın İnşaat", grossTotal: "640000.00" }]);
  });

  it("dönemi NULL olan kayıt bir aya atfedilemez — birikime girmez", () => {
    const accrual = computeDiaryAccrual(
      input({
        employerItems: [employer({ period_year: null, period_month: null })],
        subcontractorItems: [subcontractor({ periodYear: null, periodMonth: null })],
      }),
    );

    // Boş toplam `sumDecimalStrings([])` → "0" (kuruş biçimi yok; kart bunu
    // yine para olarak biçimlendirir).
    expect(accrual.employerTotal).toBe("0");
    expect(accrual.subcontractorRows).toEqual([]);
  });

  it("aynı taşeronun birden çok hakedişi TEK satırda toplanır", () => {
    const accrual = computeDiaryAccrual(
      input({
        subcontractorItems: [
          subcontractor({ id: "scpp-1", grossTotal: "640000.00" }),
          subcontractor({ id: "scpp-2", grossTotal: "160000.00" }),
        ],
      }),
    );

    expect(accrual.subcontractorRows).toEqual([{ name: "Akın İnşaat", grossTotal: "800000.00" }]);
  });

  it("taşeron satırları tutara göre azalan, eşitlikte ada göre sıralanır (deterministik)", () => {
    const accrual = computeDiaryAccrual(
      input({
        subcontractorItems: [
          subcontractor({ id: "a", subcontractorName: "Yılmaz Elektrik", grossTotal: "320000.00" }),
          subcontractor({ id: "b", subcontractorName: "Akın İnşaat", grossTotal: "640000.00" }),
          subcontractor({ id: "c", subcontractorName: "Çelik Yapı", grossTotal: "320000.00" }),
        ],
      }),
    );

    expect(accrual.subcontractorRows?.map((row) => row.name)).toEqual([
      "Akın İnşaat",
      "Çelik Yapı",
      "Yılmaz Elektrik",
    ]);
  });

  it("işveren listesi YÜKLENİYORSA tutar basılmaz, gerekçe döner", () => {
    const accrual = computeDiaryAccrual(input({ isEmployerLoading: true }));

    expect(accrual.employerTotal).toBeNull();
    expect(accrual.employerPendingReason).toBe("İşveren hakedişleri yükleniyor…");
    // İşveren toplamı yoksa kâr da hesaplanamaz.
    expect(accrual.grossProfit).toBeNull();
  });

  it("işveren listesi HATALIYSA tutar basılmaz, gerekçe döner", () => {
    const accrual = computeDiaryAccrual(input({ isEmployerError: true }));

    expect(accrual.employerTotal).toBeNull();
    expect(accrual.employerPendingReason).toContain("yüklenemedi");
    expect(accrual.grossProfit).toBeNull();
  });

  it("taşeron listesi HATALIYSA satırlar ve kâr basılmaz (işveren tutarı yine basılır)", () => {
    const accrual = computeDiaryAccrual(input({ isSubcontractorError: true }));

    expect(accrual.employerTotal).toBe("2100000.00");
    expect(accrual.subcontractorRows).toBeNull();
    expect(accrual.grossProfit).toBeNull();
    expect(accrual.subcontractorPendingReason).toContain("brüt kâr gösterilemiyor");
  });

  it("taşeron listesi sunucu tavanında KIRPILDIYSA satırlar ve kâr SESSİZCE basılmaz", () => {
    const accrual = computeDiaryAccrual(
      input({
        subcontractorTruncation: { isTruncated: true, shownCount: 200, totalCount: 210 },
      }),
    );

    expect(accrual.subcontractorRows).toBeNull();
    expect(accrual.grossProfit).toBeNull();
    expect(accrual.subcontractorPendingReason).toContain("liste eksik.");
    expect(accrual.subcontractorPendingReason).toContain("brüt kâr bu yüzden gösterilmiyor");
  });

  it("taşeron listesi YÜKLENİYORSA satırlar ve kâr beklemede kalır", () => {
    const accrual = computeDiaryAccrual(input({ isSubcontractorLoading: true }));

    expect(accrual.subcontractorPendingReason).toBe("Taşeron hakedişleri yükleniyor…");
    expect(accrual.grossProfit).toBeNull();
  });

  it("o ay taşeron hakedişi yoksa kâr işveren tutarına eşittir (negatife kırpma yok)", () => {
    const accrual = computeDiaryAccrual(input({ subcontractorItems: [] }));

    expect(accrual.subcontractorRows).toEqual([]);
    expect(accrual.grossProfit).toBe("2100000.00");
  });

  it("taşeron tutarı işvereni aşarsa kâr NEGATİF basılır (gerçek sonuç)", () => {
    const accrual = computeDiaryAccrual(
      input({ subcontractorItems: [subcontractor({ grossTotal: "2500000.00" })] }),
    );

    expect(accrual.grossProfit).toBe("-400000.00");
  });
});

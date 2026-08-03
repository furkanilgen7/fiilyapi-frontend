import { describe, it, expect } from "vitest";

import { computeSiteSubcontractorTotals } from "./site-subcontractor-totals";
import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

function item(overrides: Partial<SiteSubcontractorPaymentItem>): SiteSubcontractorPaymentItem {
  return {
    id: "scpp-1",
    contractId: "sc-1",
    subcontractorName: "Akın İnşaat",
    sequenceNo: 47,
    workCategory: "Betonarme İşleri",
    grossTotal: "0.00",
    netTotal: "0.00",
    status: "paid",
    isRevisionRequired: false,
    ...overrides,
  };
}

describe("computeSiteSubcontractorTotals", () => {
  it("boş listede sıfır döner", () => {
    const totals = computeSiteSubcontractorTotals([]);
    expect(totals.grossTotal).toBe("0");
    expect(totals.distinctSubcontractorCount).toBe(0);
    expect(totals.pendingApprovalCount).toBe(0);
  });

  it("kuruş hassasiyetli toplar (float yuvarlama tuzağı yok)", () => {
    const totals = computeSiteSubcontractorTotals([
      item({ grossTotal: "0.10" }),
      item({ grossTotal: "0.20" }),
    ]);
    expect(totals.grossTotal).toBe("0.30");
  });

  it("distinct taşeron sayısını isme göre tekilleştirir (mockup '12 taşeron')", () => {
    const totals = computeSiteSubcontractorTotals([
      item({ subcontractorName: "Akın İnşaat", contractId: "sc-1" }),
      // aynı taşeronun ikinci hakedişi/sözleşmesi — tekil sayılır
      item({ subcontractorName: "Akın İnşaat", contractId: "sc-2" }),
      item({ subcontractorName: "Yılmaz Elektrik" }),
    ]);
    expect(totals.distinctSubcontractorCount).toBe(2);
  });

  it("yalnız pending_approval durumundakileri sayar", () => {
    const totals = computeSiteSubcontractorTotals([
      item({ status: "pending_approval" }),
      item({ status: "approved" }),
      item({ status: "pending_approval" }),
      item({ status: "paid" }),
    ]);
    expect(totals.pendingApprovalCount).toBe(2);
  });
});

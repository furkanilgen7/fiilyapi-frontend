import { describe, it, expect } from "vitest";

import { computeProgressPaymentsTotals } from "./totals";
import type { ProgressPaymentListItem } from "@/lib/api/hooks/useProgressPayments";

function item(overrides: Partial<ProgressPaymentListItem>): ProgressPaymentListItem {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    project_id: "33333333-3333-3333-3333-333333333333",
    project_name: "Güneşkent A-Blok",
    sequence_no: 1,
    period_year: 2026,
    period_month: 1,
    description: null,
    status: "paid",
    gross_total: "0.00",
    net_total: "0.00",
    ...overrides,
  } as ProgressPaymentListItem;
}

describe("computeProgressPaymentsTotals — kuruş hassasiyeti (coordinator review T6 fix)", () => {
  it("bos listede toplam 0, onay bekleyen 0 doner", () => {
    const totals = computeProgressPaymentsTotals([]);
    expect(totals.grossTotal).toBe("0");
    expect(totals.pendingApprovalCount).toBe(0);
  });

  // Float toplama (Number ile) burada yuvarlama hatasi uretirdi:
  // 0.1 + 0.2 = 0.30000000000000004 (IEEE-754). sumDecimalStrings BigInt
  // tabanli oldugundan kuruşu KAYIPSIZ toplar.
  it("float toplamanin yuvarlama hatasi uretecegi bir fikstürde kuruş hassasiyetini korur", () => {
    const totals = computeProgressPaymentsTotals([
      item({ gross_total: "0.10" }),
      item({ gross_total: "0.20" }),
    ]);
    expect(totals.grossTotal).toBe("0.30");
    expect(Number(totals.grossTotal)).not.toBe(0.1 + 0.2); // float tuzagi belgelenir
  });

  it("cok terimli, buyuk tutarli bir listede tam kurus toplamini doner", () => {
    const totals = computeProgressPaymentsTotals([
      item({ gross_total: "1000000.10" }),
      item({ gross_total: "2000000.20" }),
      item({ gross_total: "500000.05" }),
    ]);
    expect(totals.grossTotal).toBe("3500000.35");
  });

  it("onay bekleyen sayimini yalniz pending_approval durumundakiler icin yapar", () => {
    const totals = computeProgressPaymentsTotals([
      item({ status: "pending_approval" }),
      item({ status: "paid" }),
      item({ status: "pending_approval" }),
      item({ status: "draft" }),
      item({ status: "approved" }),
    ]);
    expect(totals.pendingApprovalCount).toBe(2);
  });
});

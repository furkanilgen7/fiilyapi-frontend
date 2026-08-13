import { describe, it, expect } from "vitest";

import type { SaleInstallmentResponse } from "@/lib/api/hooks/useSaleInstallments";
import {
  emptySaleFormValues,
  normalizeDecimalInput,
  planRowsFromServer,
  salePriceNumber,
  updatePlanRow,
} from "./form-state";

function installment(overrides: Partial<SaleInstallmentResponse> = {}): SaleInstallmentResponse {
  return {
    id: "si-1",
    sale_id: "sl-1",
    sequence_no: 1,
    label: "Peşinat",
    due_date: "2026-09-01",
    amount: "440000.00",
    payment_method: "transfer",
    paid_amount: "0.00",
    paid_at: null,
    remaining_amount: "440000.00",
    is_overdue: false,
    ...overrides,
  } as SaleInstallmentResponse;
}

describe("normalizeDecimalInput", () => {
  it("TR virgülünü noktaya çevirir, boş/geçersizi null yapar", () => {
    expect(normalizeDecimalInput("440000")).toBe("440000");
    expect(normalizeDecimalInput("12,5")).toBe("12.5");
    expect(normalizeDecimalInput(" 12.5 ")).toBe("12.5");
    expect(normalizeDecimalInput("")).toBeNull();
    expect(normalizeDecimalInput("abc")).toBeNull();
  });
});

describe("salePriceNumber", () => {
  it("geçerli bedeli sayıya çevirir, geçersizi null bırakır", () => {
    expect(salePriceNumber({ ...emptySaleFormValues(), salePrice: "1440000" })).toBe(1440000);
    expect(salePriceNumber({ ...emptySaleFormValues(), salePrice: "" })).toBeNull();
  });
});

describe("planRowsFromServer", () => {
  it("ilk satır 'Peşinat' etiketliyse peşinat işaretlenir, ödeme yöntemi taşınır", () => {
    const rows = planRowsFromServer([
      installment({ sequence_no: 1, label: "Peşinat", payment_method: "transfer" }),
      installment({ id: "si-2", sequence_no: 2, label: "1. Taksit", payment_method: null }),
    ]);
    expect(rows[0].isDownPayment).toBe(true);
    expect(rows[0].paymentMethod).toBe("transfer");
    expect(rows[1].isDownPayment).toBe(false);
    // null ödeme yöntemi "" olur (Select boş seçenek).
    expect(rows[1].paymentMethod).toBe("");
  });
});

describe("updatePlanRow", () => {
  it("yalnız hedef satırı immutable şekilde günceller", () => {
    const rows = planRowsFromServer([installment(), installment({ id: "si-2", sequence_no: 2, label: "1. Taksit" })]);
    const next = updatePlanRow(rows, rows[1].key, { amount: "500000" });
    expect(next[1].amount).toBe("500000");
    expect(next[0]).toBe(rows[0]); // referans korunur (dokunulmadı)
  });
});

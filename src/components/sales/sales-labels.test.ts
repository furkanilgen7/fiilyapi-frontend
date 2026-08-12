import { describe, it, expect } from "vitest";

import {
  customerLine,
  filterSales,
  maskNationalId,
  matchesSalesStatusFilter,
  parseSalesStatusFilter,
  paymentPlanCell,
  saleRowTone,
  saleStatusBadge,
  SALES_STATUS_FILTER_OPTIONS,
  type SaleRow,
} from "./sales-labels";

function row(overrides: Partial<SaleRow> = {}): SaleRow {
  return {
    id: "sl-1",
    status: "active",
    unit_label: "A · Daire 12",
    customer_name: "Mehmet Aydın",
    customer_national_id: "12345678901",
    customer_tax_number: null,
    sale_price: "1120000.00",
    paid_amount: "1120000.00",
    remaining_amount: "0.00",
    payment_plan_type: "cash",
    installment_total: 0,
    installment_paid_count: 0,
    overdue_installment_count: 0,
    reservation_deposit: null,
    reservation_due_date: null,
    ...overrides,
  };
}

describe("saleStatusBadge — SY 166/175/184/193/202", () => {
  it("tapu devredilmiş satış yeşil 'Tapu Devredildi' rozetidir (166)", () => {
    expect(saleStatusBadge(row({ status: "deed_transferred" }))).toEqual({
      label: "Tapu Devredildi",
      variant: "success",
      modifier: "deed",
    });
  });

  it("rezervasyon kehribar 'Rezerve' rozetidir (193)", () => {
    expect(saleStatusBadge(row({ status: "reservation" })).label).toBe("Rezerve");
    expect(saleStatusBadge(row({ status: "reservation" })).variant).toBe("warning");
  });

  // Mockup'ın "Taksitli"/"Gecikmiş" görünümleri sunucunun TÜREV alanlarından
  // ayrılır; ekranda vade/gecikme HESAPLANMAZ.
  it("taksitli aktif satış mavi 'Taksitli' rozetidir (175)", () => {
    const badge = saleStatusBadge(
      row({ payment_plan_type: "down_payment_installments", installment_total: 12 }),
    );
    expect(badge.label).toBe("Taksitli");
    expect(badge.variant).toBe("primary");
  });

  it("gecikmiş taksit VARSA rozet kırmızı 'Gecikmiş'e döner (184)", () => {
    const badge = saleStatusBadge(
      row({ payment_plan_type: "down_payment_installments", overdue_installment_count: 2 }),
    );
    expect(badge.label).toBe("Gecikmiş");
    expect(badge.variant).toBe("danger");
  });

  it("iptal edilmiş satış uydurma rozet almaz, enum çevirisi basılır", () => {
    expect(saleStatusBadge(row({ status: "cancelled" })).label).toBe("İptal");
  });
});

describe("saleRowTone — SY 177/186", () => {
  it("gecikmiş satır kırmızı tonundadır", () => {
    expect(saleRowTone(row({ overdue_installment_count: 1 }))).toBe("overdue");
  });
  it("rezerve satır kehribar tonundadır", () => {
    expect(saleRowTone(row({ status: "reservation" }))).toBe("reservation");
  });
  it("normal satırın zemini boyanmaz", () => {
    expect(saleRowTone(row())).toBe("default");
  });
});

describe("durum süzgeci (SY 146) — İSTEMCİDE", () => {
  it("mockup'ın üç seçeneğini taşır", () => {
    expect(SALES_STATUS_FILTER_OPTIONS.map((o) => o.label)).toEqual([
      "Tapulu",
      "Rezerve",
      "Vadesi Geçen",
    ]);
  });

  it("bilinmeyen URL değeri süzgeç UYGULAMAZ", () => {
    expect(parseSalesStatusFilter("uydurma")).toBeUndefined();
    expect(parseSalesStatusFilter(null)).toBeUndefined();
    expect(parseSalesStatusFilter("reservation")).toBe("reservation");
  });

  it("'Vadesi Geçen' bir durum değil, sunucunun gecikme SAYISININ türevidir", () => {
    expect(matchesSalesStatusFilter(row({ overdue_installment_count: 2 }), "overdue")).toBe(true);
    expect(matchesSalesStatusFilter(row({ overdue_installment_count: 0 }), "overdue")).toBe(false);
  });

  it("süzgeç listeyi daraltır ve sunucunun sırasını korur", () => {
    const rows = [
      row({ id: "a", status: "deed_transferred" }),
      row({ id: "b", status: "reservation" }),
      row({ id: "c", status: "deed_transferred" }),
    ];
    expect(filterSales(rows, "deed_transferred").map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterSales(rows, undefined)).toHaveLength(3);
  });
});

describe("paymentPlanCell — SY 165/174/183/192", () => {
  it("peşin plan 'Peşin' basar (165)", () => {
    expect(paymentPlanCell(row()).text).toBe("Peşin");
  });

  it("taksitli plan SUNUCUNUN sayaçlarını basar (174)", () => {
    const cell = paymentPlanCell(
      row({
        payment_plan_type: "down_payment_installments",
        installment_total: 12,
        installment_paid_count: 8,
      }),
    );
    expect(cell.text).toBe("12 taksit · 8/12");
    expect(cell.isOverdue).toBe(false);
  });

  it("gecikmiş satırda plan hücresi kırmızı işaretlenir (183)", () => {
    const cell = paymentPlanCell(
      row({
        payment_plan_type: "down_payment_installments",
        installment_total: 10,
        installment_paid_count: 5,
        overdue_installment_count: 2,
      }),
    );
    expect(cell.text).toBe("10 taksit · 5/10");
    expect(cell.isOverdue).toBe(true);
  });

  it("plan tipi yoksa 'Belirlenmedi' basılır (192)", () => {
    const cell = paymentPlanCell(row({ payment_plan_type: null }));
    expect(cell.text).toBe("Belirlenmedi");
    expect(cell.isMuted).toBe(true);
  });

  it("taksitli seçilip plan üretilmemişse ayrı bir metin basılır", () => {
    expect(
      paymentPlanCell(row({ payment_plan_type: "down_payment_installments" })).text,
    ).toBe("Plan üretilmedi");
  });
});

describe("customerLine — SY 161/179/188/197", () => {
  it("TCKN maskelenir (161)", () => {
    expect(customerLine(row())).toEqual({ text: "TCKN: 123****901", tone: "muted" });
    expect(maskNationalId("12345678901")).toBe("123****901");
    expect(maskNationalId("123")).toBe("123");
  });

  it("VKN maskelenmez (197 kurumsal kimlik)", () => {
    const line = customerLine(
      row({ customer_national_id: null, customer_tax_number: "7788990011" }),
    );
    expect(line).toEqual({ text: "VKN: 7788990011", tone: "muted" });
  });

  it("gecikme uyarısı kimliğin YERİNE geçer (179)", () => {
    expect(customerLine(row({ overdue_installment_count: 2 }))).toEqual({
      text: "⚠ 2 taksit gecikmiş",
      tone: "danger",
    });
  });

  it("rezervasyonda kapora + VADE basılır; gün SAYILMAZ (188)", () => {
    const line = customerLine(
      row({
        status: "reservation",
        reservation_deposit: "50000.00",
        reservation_due_date: "2026-07-31",
      }),
    );
    expect(line).toEqual({ text: "Kapora alındı · 31.07.2026 tarihine kadar", tone: "warning" });
  });

  it("kimlik alanlarının ikisi de boşsa satır BASILMAZ (uydurma yok)", () => {
    expect(customerLine(row({ customer_national_id: null, customer_tax_number: null }))).toBeNull();
  });
});

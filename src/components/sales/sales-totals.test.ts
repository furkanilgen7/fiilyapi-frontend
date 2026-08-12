import { describe, it, expect } from "vitest";

import type { SaleRow } from "./sales-labels";
import { deriveSalesTotals, resolveSalesTotals } from "./sales-totals";

function row(id: string, price: string, paid: string, remaining: string): SaleRow {
  return {
    id,
    status: "active",
    unit_label: `A · Daire ${id}`,
    customer_name: "Alıcı",
    customer_national_id: null,
    customer_tax_number: null,
    sale_price: price,
    paid_amount: paid,
    remaining_amount: remaining,
    payment_plan_type: "cash",
    installment_total: 0,
    installment_paid_count: 0,
    overdue_installment_count: 0,
    reservation_deposit: null,
    reservation_due_date: null,
  };
}

const SERVER_TOTALS = {
  count: 5,
  sale_price_total: "31420000.00",
  paid_total: "24820000.00",
  remaining_total: "6600000.00",
};

describe("resolveSalesTotals — SY 205-215 tfoot'unun İKİ kaynağı", () => {
  const rows = [
    row("1", "1120000.00", "1120000.00", "0.00"),
    row("2", "980000.55", "686000.25", "294000.30"),
  ];

  it("süzgeç KAPALIYKEN sunucunun totals'ı OLDUĞU GİBİ basılır (istemci toplamaz)", () => {
    const totals = resolveSalesTotals({
      visibleRows: rows,
      serverTotals: SERVER_TOTALS,
      isFiltered: false,
    });
    expect(totals).toEqual({
      count: 5,
      salePriceTotal: "31420000.00",
      paidTotal: "24820000.00",
      remainingTotal: "6600000.00",
      isDerived: false,
    });
  });

  // MUTASYON KANITI: aynı girdiyle yalnız `isFiltered` değişir; sonuç sunucu
  // toplamından GÖRÜNEN satırların toplamına döner. Süzgeç açıkken sunucu
  // toplamını basmak 2 satır gösterip 5 satışın toplamını yazmak olurdu.
  it("süzgeç AÇIKKEN toplam GÖRÜNEN satırlardan türetilir", () => {
    const totals = resolveSalesTotals({
      visibleRows: rows,
      serverTotals: SERVER_TOTALS,
      isFiltered: true,
    });
    expect(totals).toEqual({
      count: 2,
      salePriceTotal: "2100000.55",
      paidTotal: "1806000.25",
      remainingTotal: "294000.30",
      isDerived: true,
    });
    expect(totals?.salePriceTotal).not.toBe(SERVER_TOTALS.sale_price_total);
  });

  it("kuruşlar kayıpsız toplanır (float yuvarlaması YOK)", () => {
    const kurus = [
      row("a", "0.10", "0.10", "0.00"),
      row("b", "0.20", "0.00", "0.20"),
      row("c", "1234567.89", "0.01", "1234567.88"),
    ];
    expect(deriveSalesTotals(kurus).salePriceTotal).toBe("1234568.19");
  });

  it("sunucu toplamı henüz gelmediyse (yükleniyor) toplam BASILMAZ", () => {
    expect(
      resolveSalesTotals({ visibleRows: [], serverTotals: undefined, isFiltered: false }),
    ).toBeUndefined();
  });

  it("süzgeç açıkken hiç satır kalmasa bile sunucu toplamına DÜŞÜLMEZ", () => {
    const totals = resolveSalesTotals({
      visibleRows: [],
      serverTotals: SERVER_TOTALS,
      isFiltered: true,
    });
    expect(totals).toEqual({
      count: 0,
      salePriceTotal: "0",
      paidTotal: "0",
      remainingTotal: "0",
      isDerived: true,
    });
  });
});

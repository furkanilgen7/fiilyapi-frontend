import { describe, expect, it } from "vitest";

import type { PayrollPeriodListRow } from "@/lib/api/hooks/usePayroll";

import {
  availableYears,
  defaultYear,
  historyTotals,
  isPaymentPending,
  kurusToDecimalString,
  parseKurus,
  paymentDateOf,
  rowsForYear,
} from "./payroll-history-derive";

function row(overrides: Partial<PayrollPeriodListRow> = {}): PayrollPeriodListRow {
  return {
    id: "period-1",
    year: 2026,
    month: 7,
    status: "pending_approval",
    payment_due_date: "2026-07-20",
    paid_at: null,
    personnel_count: 48,
    gross_total: "743200.00",
    sgk_employer_total: "148800.00",
    net_total: "549148.00",
    total_cost: "892000.00",
    ...overrides,
  };
}

describe("parseKurus / kurusToDecimalString — para STRING'dir, float aritmetiği YOK", () => {
  it("iki ondalıklı Decimal metnini tam sayı kuruşa çevirir", () => {
    expect(parseKurus("743200.00")).toBe(74320000n);
    expect(parseKurus("0.01")).toBe(1n);
    expect(parseKurus("12")).toBe(1200n);
    expect(parseKurus("-5.50")).toBe(-550n);
  });

  it("ikiden fazla ondalık KESİLİR (yuvarlanmaz — olmayan hassasiyet uydurulmaz)", () => {
    expect(parseKurus("1.239")).toBe(123n);
  });

  it("sayı olmayan girdi `null` döner — sessizce 0 SAYILMAZ", () => {
    expect(parseKurus("")).toBeNull();
    expect(parseKurus("bilinmiyor")).toBeNull();
    expect(parseKurus("1.2.3")).toBeNull();
  });

  it("kuruş → Decimal metni gidiş-dönüşü kayıpsızdır", () => {
    for (const value of ["0.00", "0.07", "5.50", "743200.00", "-12.34"]) {
      expect(kurusToDecimalString(parseKurus(value) as bigint)).toBe(value);
    }
  });

  it("float toplamanın kaydırdığı bir toplamı TAM verir", () => {
    // 0.1 + 0.2 float'ta 0.30000000000000004'tür; kuruş aritmetiği tamdır.
    const rows = [row({ id: "a", net_total: "0.10" }), row({ id: "b", net_total: "0.20" })];
    expect(historyTotals(rows).netTotal).toBe("0.30");
  });
});

describe("yıl süzgeci (K6 — sunucuda `year` parametresi YOK)", () => {
  const rows = [
    row({ id: "a", year: 2025, month: 12 }),
    row({ id: "b", year: 2026, month: 3 }),
    row({ id: "c", year: 2026, month: 7 }),
  ];

  it("seçenekler GELEN VERİDEN türer, yeniden eskiye", () => {
    expect(availableYears(rows)).toEqual([2026, 2025]);
  });

  it("hiç dönem yoksa seçenek de varsayılan yıl da yoktur", () => {
    expect(availableYears([])).toEqual([]);
    expect(defaultYear([])).toBeUndefined();
  });

  it("varsayılan yıl en YENİ yıldır", () => {
    expect(defaultYear(rows)).toBe(2026);
  });

  it("seçili yılın satırlarını yeniden eskiye verir ve girdiyi MUTASYONA UĞRATMAZ", () => {
    const snapshot = rows.map((item) => item.id);
    expect(rowsForYear(rows, 2026).map((item) => item.id)).toEqual(["c", "b"]);
    expect(rows.map((item) => item.id)).toEqual(snapshot);
  });

  it("veride olmayan yıl BOŞ döner (süzgecin kendi boş hâli)", () => {
    expect(rowsForYear(rows, 2024)).toEqual([]);
    expect(rowsForYear(rows, undefined)).toEqual([]);
  });
});

describe("🔴 K4 — tfoot mockup'tan DEĞİL satırlardan türer", () => {
  const rows = [
    row({ id: "a", month: 7, personnel_count: 48, gross_total: "743200.00" }),
    row({ id: "b", month: 6, personnel_count: 46, gross_total: "712400.00" }),
    row({ id: "c", month: 5, personnel_count: 45, gross_total: "698500.00" }),
  ];

  it("ay sayısı satır sayısını İZLER (mockup'ın '7 Ay' sabiti kopyalanmaz)", () => {
    expect(historyTotals(rows).periodCount).toBe(3);
    expect(historyTotals(rows.slice(0, 2)).periodCount).toBe(2);
    expect(historyTotals([]).periodCount).toBe(0);
  });

  it("toplamlar kuruşu kuruşuna doğrudur", () => {
    const totals = historyTotals(rows);
    expect(totals.grossTotal).toBe("2154100.00"); // 743.200 + 712.400 + 698.500
    expect(totals.sgkEmployerTotal).toBe("446400.00");
    expect(totals.netTotal).toBe("1647444.00");
    expect(totals.costTotal).toBe("2676000.00");
  });

  it("ortalama çalışan sayısı satırlardan hesaplanır", () => {
    expect(historyTotals(rows).personnelAverage).toBe(46); // (48+46+45)/3 = 46,33
    expect(historyTotals([]).personnelAverage).toBe(0);
  });

  it("okunamayan tutar toplama GİRMEZ ve sayılır (sessiz yutma yok)", () => {
    const totals = historyTotals([row({ id: "a", net_total: "yok" }), row({ id: "b" })]);
    expect(totals.unparsedCount).toBe(1);
    expect(totals.netTotal).toBe("549148.00");
  });
});

describe("satır hâli", () => {
  it("ödeme damgası basılmamış her dönem 'ödeme bekliyor'dur", () => {
    expect(isPaymentPending(row({ paid_at: null }))).toBe(true);
    expect(isPaymentPending(row({ paid_at: "2026-06-20" }))).toBe(false);
  });

  it("ödeme tarihi: ödendiyse damga günü, aksi hâlde vade", () => {
    expect(paymentDateOf(row({ paid_at: "2026-06-19T08:30:00Z" }))).toBe("2026-06-19");
    expect(paymentDateOf(row({ paid_at: null, payment_due_date: "2026-07-20" }))).toBe(
      "2026-07-20",
    );
  });

  it("ikisi de yoksa tarih UYDURULMAZ", () => {
    expect(paymentDateOf(row({ paid_at: null, payment_due_date: null }))).toBeUndefined();
  });
});

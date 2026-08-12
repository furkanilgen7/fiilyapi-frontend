import { describe, it, expect } from "vitest";

import { emptyStockEntryFormValues, type StockEntryFormValues } from "./form-state";
import { MESSAGES, hasStockEntryErrors, validateStockEntryForm } from "./validate";

function values(overrides: Partial<StockEntryFormValues> = {}): StockEntryFormValues {
  return {
    ...emptyStockEntryFormValues("2026-08-12"),
    warehouseId: "wh-1",
    lines: [{ key: "line-0", itemId: "it-1", quantity: "15", unitPrice: "21500", quality: "ok" }],
    ...overrides,
  };
}

describe("validateStockEntryForm — geçerli form", () => {
  it("dolu bir satınalma girişi hata üretmez", () => {
    expect(hasStockEntryErrors(validateStockEntryForm(values()))).toBe(false);
  });
});

describe("koşullu kaynak depo (backend §7 S4 · 422 kuralları)", () => {
  it("transferde kaynak depo ZORUNLUDUR", () => {
    const errors = validateStockEntryForm(values({ entryType: "transfer" }));

    expect(errors.sourceWarehouseId).toBe(MESSAGES.sourceWarehouseRequired);
  });

  it("kendine transfer engellenir", () => {
    const errors = validateStockEntryForm(
      values({ entryType: "transfer", sourceWarehouseId: "wh-1" }),
    );

    expect(errors.sourceWarehouseId).toBe(MESSAGES.sourceWarehouseSame);
  });

  it("transfer dışı tiplerde kaynak depo DOLU olsa bile kural işlemez (alan gövdeye girmez)", () => {
    const errors = validateStockEntryForm(
      values({ entryType: "purchase", sourceWarehouseId: "wh-1" }),
    );

    expect(errors.sourceWarehouseId).toBeUndefined();
  });
});

describe("miktar işaret kuralı (§7 S4)", () => {
  it.each(["purchase", "transfer"] as const)(
    "%s tipinde NEGATİF miktar reddedilir",
    (entryType) => {
      const errors = validateStockEntryForm(
        values({
          entryType,
          sourceWarehouseId: "wh-0",
          lines: [{ key: "line-0", itemId: "it-1", quantity: "-5", unitPrice: "", quality: "ok" }],
        }),
      );

      expect(errors.lineErrors["line-0"]?.quantity).toBe(MESSAGES.quantityNegative);
    },
  );

  it("adjustment tipinde NEGATİF miktar MEŞRUDUR", () => {
    const errors = validateStockEntryForm(
      values({
        entryType: "adjustment",
        lines: [{ key: "line-0", itemId: "it-1", quantity: "-5", unitPrice: "", quality: "ok" }],
      }),
    );

    expect(errors.lineErrors["line-0"]).toBeUndefined();
  });

  it("SIFIR miktar her tipte reddedilir", () => {
    const errors = validateStockEntryForm(
      values({
        entryType: "adjustment",
        lines: [{ key: "line-0", itemId: "it-1", quantity: "0", unitPrice: "", quality: "ok" }],
      }),
    );

    expect(errors.lineErrors["line-0"]?.quantity).toBe(MESSAGES.quantityZero);
  });
});

describe("zorunlu alanlar ve sınırlar", () => {
  it("depo ve tarih zorunludur", () => {
    const errors = validateStockEntryForm(values({ warehouseId: "", entryDate: "" }));

    expect(errors.warehouseId).toBe(MESSAGES.warehouseRequired);
    expect(errors.entryDate).toBe(MESSAGES.entryDateRequired);
  });

  it("malzeme seçilmemiş satır reddedilir", () => {
    const errors = validateStockEntryForm(
      values({
        lines: [{ key: "line-0", itemId: "", quantity: "1", unitPrice: "", quality: "ok" }],
      }),
    );

    expect(errors.lineErrors["line-0"]?.itemId).toBe(MESSAGES.itemRequired);
  });

  it("hiç satır yoksa tablo hatası üretilir", () => {
    const errors = validateStockEntryForm(values({ lines: [] }));

    expect(errors.lines).toBe(MESSAGES.linesRequired);
  });

  it("not şema tavanını (2000) aşamaz", () => {
    const errors = validateStockEntryForm(values({ note: "a".repeat(2001) }));

    expect(errors.note).toBe(MESSAGES.noteTooLong);
    expect(validateStockEntryForm(values({ note: "a".repeat(2000) })).note).toBeUndefined();
  });

  it("negatif birim fiyat reddedilir", () => {
    const errors = validateStockEntryForm(
      values({
        lines: [{ key: "line-0", itemId: "it-1", quantity: "1", unitPrice: "-1", quality: "ok" }],
      }),
    );

    expect(errors.lineErrors["line-0"]?.unitPrice).toBe(MESSAGES.unitPriceNegative);
  });
});

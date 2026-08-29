import { describe, it, expect } from "vitest";

import { buildStockEntryBody } from "./build-body";
import { emptyStockEntryFormValues, type StockEntryFormValues } from "./form-state";

function values(overrides: Partial<StockEntryFormValues> = {}): StockEntryFormValues {
  const base = emptyStockEntryFormValues("2026-08-12");
  return {
    ...base,
    warehouseId: "wh-1",
    lines: [{ key: "line-0", itemId: "it-1", quantity: "15", unitPrice: "21500", quality: "ok", sectionId: "", boqItemId: "" }],
    ...overrides,
  };
}

/**
 * ⚠️ DİLİMİN 3. ANA TUZAĞI (pending sızıntısı, F-PT emsali).
 *
 * Aşağıdaki iki test gövdenin anahtar KÜMESİNİ birebir iddia eder: fazladan
 * TEK bir anahtar (sipariş, oto-bildirim, belge, satır `key`si ya da tipe
 * uymayan `source_warehouse_id`) testi KIRMIZI yapar. `toMatchObject` bilerek
 * KULLANILMAZ — fazlalığı görmez.
 */
describe("buildStockEntryBody — GÖVDE ANAHTAR TESTİ (pending sızıntısı)", () => {
  it("purchase gövdesi YALNIZ şemadaki anahtarları taşır; sipariş/bildirim/belge SIZMAZ", () => {
    const body = buildStockEntryBody(
      values({
        supplierName: "Demirsan A.Ş.",
        deliveryNoteNo: "IRS-2026-8842",
        receivedByUserId: "u-2",
        note: "Eksik teslimat",
      }),
    );

    expect(Object.keys(body).sort()).toEqual([
      "delivery_note_no",
      "entry_date",
      "entry_type",
      "lines",
      "note",
      "received_by_user_id",
      "supplier_name",
      "warehouse_id",
    ]);
    // Sipariş / oto-bildirim / belge anahtarları HİÇBİR adla var olamaz.
    for (const forbidden of [
      "order_id",
      "purchase_order_id",
      "notify_supplier",
      "auto_notify",
      "documents",
      "files",
      "source_warehouse_id",
    ]) {
      expect(body, forbidden).not.toHaveProperty(forbidden);
    }

    expect(Object.keys(body.lines[0]).sort()).toEqual([
      "item_id",
      "quality",
      "quantity",
      "unit_price",
    ]);
    // Satırın istemci `key`i de gövdeye girmez.
    expect(body.lines[0]).not.toHaveProperty("key");
    // "Tutar" TÜREVDİR — kolon da alan da yoktur.
    expect(body.lines[0]).not.toHaveProperty("amount");
    expect(body.lines[0]).not.toHaveProperty("total");
  });

  it("boş bırakılan isteğe bağlı alanlar anahtar olarak HİÇ kurulmaz", () => {
    const body = buildStockEntryBody(values());

    expect(Object.keys(body).sort()).toEqual([
      "entry_date",
      "entry_type",
      "lines",
      "warehouse_id",
    ]);
  });

  it("fiyatsız satırda `unit_price` anahtarı yoktur (uydurma 0 basılmaz)", () => {
    const body = buildStockEntryBody(
      values({
        lines: [{ key: "line-0", itemId: "it-8", quantity: "40", unitPrice: "", quality: "ok", sectionId: "", boqItemId: "" }],
      }),
    );

    expect(Object.keys(body.lines[0]).sort()).toEqual(["item_id", "quality", "quantity"]);
  });
});

describe("buildStockEntryBody — koşullu `source_warehouse_id` (backend §7 S4)", () => {
  it("transfer tipinde kaynak depo gövdeye GİRER", () => {
    const body = buildStockEntryBody(
      values({ entryType: "transfer", sourceWarehouseId: "wh-0" }),
    );

    expect(body.entry_type).toBe("transfer");
    expect(body.source_warehouse_id).toBe("wh-0");
  });

  it.each(["purchase", "adjustment"] as const)(
    "%s tipinde kaynak depo alanı DOLU olsa bile gövdeye GİRMEZ (sunucu 422 verirdi)",
    (entryType) => {
      const body = buildStockEntryBody(
        values({ entryType, sourceWarehouseId: "wh-0" }),
      );

      expect(body).not.toHaveProperty("source_warehouse_id");
    },
  );
});

describe("buildStockEntryBody — sayı biçimi", () => {
  it("TR virgülü noktaya çevrilir ve miktar STRING olarak gönderilir", () => {
    const body = buildStockEntryBody(
      values({
        lines: [
          { key: "line-0", itemId: "it-1", quantity: "2,5", unitPrice: "21500,75", quality: "defective", sectionId: "", boqItemId: "" },
        ],
      }),
    );

    expect(body.lines[0].quantity).toBe("2.5");
    expect(body.lines[0].unit_price).toBe("21500.75");
    expect(body.lines[0].quality).toBe("defective");
  });

  it("adjustment satırı NEGATİF miktarı olduğu gibi taşır", () => {
    const body = buildStockEntryBody(
      values({
        entryType: "adjustment",
        lines: [{ key: "line-0", itemId: "it-1", quantity: "-5", unitPrice: "", quality: "ok", sectionId: "", boqItemId: "" }],
      }),
    );

    expect(body.lines[0].quantity).toBe("-5");
  });
});

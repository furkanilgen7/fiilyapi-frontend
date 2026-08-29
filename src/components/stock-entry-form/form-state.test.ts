import { describe, it, expect } from "vitest";

import {
  addStockEntryLine,
  createStockEntryLine,
  emptyStockEntryFormValues,
  normalizeDecimalInput,
  removeStockEntryLine,
  stockEntryLineAmount,
  stockEntryTotal,
  updateStockEntryLine,
} from "./form-state";

describe("emptyStockEntryFormValues", () => {
  it("ilk kart seçili, tarih çağırandan gelir ve tek boş satır açılır", () => {
    const values = emptyStockEntryFormValues("2026-08-12");

    expect(values.entryType).toBe("purchase");
    expect(values.entryDate).toBe("2026-08-12");
    expect(values.lines).toHaveLength(1);
    expect(values.lines[0].quality).toBe("ok");
  });

  it("pending yüzeylerin form durumunda KARŞILIĞI YOKTUR (yapısal sızıntı koruması)", () => {
    const values = emptyStockEntryFormValues("2026-08-12");

    for (const forbidden of ["orderId", "notifySupplier", "autoNotify", "documents"]) {
      expect(values, forbidden).not.toHaveProperty(forbidden);
    }
  });
});

describe("satır işlemleri — hepsi YENİ nesne döner (mutasyon yok)", () => {
  it("ekleme/silme/güncelleme kaynağı DEĞİŞTİRMEZ", () => {
    const values = emptyStockEntryFormValues("2026-08-12");
    const firstKey = values.lines[0].key;

    const added = addStockEntryLine(values, 1);
    expect(added.lines).toHaveLength(2);
    expect(values.lines).toHaveLength(1);

    const updated = updateStockEntryLine(added, firstKey, { quantity: "15" });
    expect(updated.lines[0].quantity).toBe("15");
    expect(added.lines[0].quantity).toBe("");

    const removed = removeStockEntryLine(updated, firstKey);
    expect(removed.lines).toHaveLength(1);
    expect(updated.lines).toHaveLength(2);
  });

  it("satır anahtarı sayaçtan deterministik üretilir", () => {
    expect(createStockEntryLine(3).key).toBe("line-3");
  });
});

describe("normalizeDecimalInput", () => {
  it.each([
    ["15", "15"],
    ["2,5", "2.5"],
    [" -5 ", "-5"],
    ["", null],
    ["abc", null],
    ["1.2.3", null],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeDecimalInput(raw)).toBe(expected);
  });
});

describe("tutar TÜREVİ (SG 116/142)", () => {
  it("miktar × birim fiyat KAYIPSIZ çarpılır", () => {
    expect(
      stockEntryLineAmount({ key: "k", itemId: "i", quantity: "15", unitPrice: "21500", quality: "ok", sectionId: "", boqItemId: "" }),
    ).toBe("322500");
    expect(
      stockEntryLineAmount({ key: "k", itemId: "i", quantity: "0.1", unitPrice: "3", quality: "ok", sectionId: "", boqItemId: "" }),
    ).toBe("0.3");
  });

  it("miktar ya da fiyat eksikse tutar hesaplanmaz (NaN ekrana kaçmaz)", () => {
    expect(
      stockEntryLineAmount({ key: "k", itemId: "i", quantity: "15", unitPrice: "", quality: "ok", sectionId: "", boqItemId: "" }),
    ).toBeNull();
  });

  it("toplam yalnız FİYATLI satırları kapsar", () => {
    const total = stockEntryTotal([
      { key: "a", itemId: "i", quantity: "15", unitPrice: "21500", quality: "ok", sectionId: "", boqItemId: "" },
      { key: "b", itemId: "j", quantity: "450", unitPrice: "168", quality: "ok", sectionId: "", boqItemId: "" },
      { key: "c", itemId: "k", quantity: "40", unitPrice: "", quality: "ok", sectionId: "", boqItemId: "" },
    ]);

    expect(Number(total)).toBe(398_100);
  });
});

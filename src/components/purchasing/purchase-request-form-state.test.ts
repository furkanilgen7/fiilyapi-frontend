import { describe, expect, it } from "vitest";

import {
  addPurchaseRequestLine,
  createPurchaseRequestLine,
  emptyPurchaseRequestFormValues,
  isPurchaseRequestLinePriced,
  purchaseRequestLineTotal,
  removePurchaseRequestLine,
  selectPurchaseRequestProject,
  selectPurchaseRequestSite,
  updatePurchaseRequestLine,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";

function line(patch: Partial<PurchaseRequestLineValues>): PurchaseRequestLineValues {
  return { ...createPurchaseRequestLine(0), ...patch };
}

describe("emptyPurchaseRequestFormValues", () => {
  it("tek boş satırla açılır ve mockup'ın ÖRNEK verisini tohumlamaz", () => {
    const values = emptyPurchaseRequestFormValues("2026-08-13");

    expect(values.lines).toHaveLength(1);
    expect(values.lines[0]).toMatchObject({ source: "stock", quantity: "", unitPrice: "" });
    expect(values.requestDate).toBe("2026-08-13");
    expect(values.priority).toBe("normal");
  });

  it("PENDING yüzeylerin form durumunda KARŞILIĞI YOKTUR (yapısal koruma)", () => {
    const keys = Object.keys(emptyPurchaseRequestFormValues("2026-08-13"));

    expect(keys).toEqual([
      "projectId",
      "requestDate",
      "priority",
      "siteId",
      "sectionId",
      "neededBy",
      "justification",
      "quoteDeadline",
      "lines",
    ]);
    // Talep numarası da yoktur: onu SUNUCU üretir.
    expect(keys).not.toContain("requestNo");
  });
});

describe("satır işlemleri değişmez (immutable) davranır", () => {
  it("ekleme/çıkarma/güncelleme özgün nesneyi DEĞİŞTİRMEZ", () => {
    const values = emptyPurchaseRequestFormValues("2026-08-13");
    const firstKey = values.lines[0].key;

    const added = addPurchaseRequestLine(values, 1);
    const updated = updatePurchaseRequestLine(added, firstKey, { quantity: "5" });
    const removed = removePurchaseRequestLine(updated, firstKey);

    expect(values.lines).toHaveLength(1);
    expect(values.lines[0].quantity).toBe("");
    expect(added.lines).toHaveLength(2);
    expect(updated.lines[0].quantity).toBe("5");
    expect(removed.lines).toHaveLength(1);
    expect(removed.lines[0].key).not.toBe(firstKey);
  });
});

describe("kademeli seçim — eski kimlik gövdeye SIZMAZ", () => {
  it("proje değişince şantiye ve bölüm DÜŞER", () => {
    const values = {
      ...emptyPurchaseRequestFormValues("2026-08-13"),
      projectId: "p-1",
      siteId: "st-1",
      sectionId: "sc-1",
    };

    const next = selectPurchaseRequestProject(values, "p-2");

    expect(next).toMatchObject({ projectId: "p-2", siteId: "", sectionId: "" });
  });

  it("aynı proje yeniden seçilirse seçim KORUNUR (gereksiz sıfırlama yok)", () => {
    const values = {
      ...emptyPurchaseRequestFormValues("2026-08-13"),
      projectId: "p-1",
      siteId: "st-1",
    };

    expect(selectPurchaseRequestProject(values, "p-1")).toBe(values);
  });

  it("şantiye değişince bölüm DÜŞER", () => {
    const values = {
      ...emptyPurchaseRequestFormValues("2026-08-13"),
      siteId: "st-1",
      sectionId: "sc-1",
    };

    expect(selectPurchaseRequestSite(values, "st-2")).toMatchObject({
      siteId: "st-2",
      sectionId: "",
    });
  });
});

describe("purchaseRequestLineTotal — TÜREV, fiyat yoksa null", () => {
  it("miktar × fiyat kayıpsız çarpılır", () => {
    expect(purchaseRequestLineTotal(line({ quantity: "15", unitPrice: "21500" }))).toBe("322500");
    expect(purchaseRequestLineTotal(line({ quantity: "0,1", unitPrice: "3" }))).toBe("0.3");
  });

  it("fiyat ya da miktar eksikse `null` döner — sessizce 0 SAYILMAZ", () => {
    expect(purchaseRequestLineTotal(line({ quantity: "15", unitPrice: "" }))).toBeNull();
    expect(purchaseRequestLineTotal(line({ quantity: "", unitPrice: "21500" }))).toBeNull();
  });
});

describe("isPurchaseRequestLinePriced — sunucunun engel ölçüsünün ikizi", () => {
  it("fiyat girilmemişse false, girilmişse true", () => {
    expect(isPurchaseRequestLinePriced(line({ unitPrice: "" }))).toBe(false);
    expect(isPurchaseRequestLinePriced(line({ unitPrice: "  " }))).toBe(false);
    expect(isPurchaseRequestLinePriced(line({ unitPrice: "0" }))).toBe(true);
  });
});

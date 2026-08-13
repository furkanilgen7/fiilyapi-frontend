import { describe, expect, it } from "vitest";

import {
  createPurchaseRequestLine,
  emptyPurchaseRequestFormValues,
  type PurchaseRequestFormValues,
  type PurchaseRequestLineValues,
} from "./purchase-request-form-state";
import {
  firstPurchaseRequestError,
  hasPurchaseRequestErrors,
  PURCHASE_REQUEST_MESSAGES,
  validatePurchaseRequestForm,
} from "./purchase-request-validate";

function line(patch: Partial<PurchaseRequestLineValues>): PurchaseRequestLineValues {
  return { ...createPurchaseRequestLine(0), ...patch };
}

function values(patch: Partial<PurchaseRequestFormValues> = {}): PurchaseRequestFormValues {
  return { ...emptyPurchaseRequestFormValues("2026-08-13"), ...patch };
}

describe("TASLAK GEVŞEKTİR — zorunlu tek alan proje", () => {
  it("yarım form taslak olarak kaydedilebilir", () => {
    const errors = validatePurchaseRequestForm(values({ projectId: "p-1" }), "draft");

    expect(hasPurchaseRequestErrors(errors)).toBe(false);
  });

  it("proje seçilmeden taslak bile kaydedilemez", () => {
    const errors = validatePurchaseRequestForm(values(), "draft");

    expect(errors.projectId).toBe(PURCHASE_REQUEST_MESSAGES.projectRequired);
  });

  it("taslakta bile TUTARLILIK kuralları koşar (sıfır/negatif miktar)", () => {
    const errors = validatePurchaseRequestForm(
      values({ projectId: "p-1", lines: [line({ key: "a", quantity: "0" })] }),
      "draft",
    );

    expect(errors.lineErrors.a.quantity).toBe(PURCHASE_REQUEST_MESSAGES.quantityNotPositive);
  });
});

describe("ONAYA GÖNDER — submit_blockers'ın aynası", () => {
  const submitReady = values({
    projectId: "p-1",
    neededBy: "2026-08-20",
    lines: [line({ key: "a", stockItemId: "s-1", quantity: "15", unitPrice: "21500" })],
  });

  it("eksiksiz form geçer", () => {
    expect(hasPurchaseRequestErrors(validatePurchaseRequestForm(submitReady, "submit"))).toBe(
      false,
    );
  });

  it("ihtiyaç tarihi zorunludur (NEEDED_BY_REQUIRED)", () => {
    const errors = validatePurchaseRequestForm({ ...submitReady, neededBy: "" }, "submit");

    expect(errors.neededBy).toBe(PURCHASE_REQUEST_MESSAGES.neededByRequired);
  });

  it("en az bir kalem gereklidir (LINES_REQUIRED)", () => {
    const errors = validatePurchaseRequestForm({ ...submitReady, lines: [] }, "submit");

    expect(errors.lines).toBe(PURCHASE_REQUEST_MESSAGES.linesRequired);
  });

  it("🔴 her kalemin tahmini birim FİYATI zorunludur — eşik bundan hesaplanır", () => {
    // NULL-EŞİK KANONU'nun gönderim kapısındaki karşılığı
    // (`validation.LINE_PRICE_REQUIRED`): fiyatsız kalem toplama girmediği
    // için ₺500K'lık bir talep "toplam 0" görünüp eşiği atlatabilirdi.
    const errors = validatePurchaseRequestForm(
      {
        ...submitReady,
        lines: [line({ key: "a", stockItemId: "s-1", quantity: "15", unitPrice: "" })],
      },
      "submit",
    );

    expect(errors.lineErrors.a.unitPrice).toBe(PURCHASE_REQUEST_MESSAGES.unitPriceRequired);
    // Eşik metni tek kaynaktan gelir — mesaj "500K" gösterimini TAŞIR.
    expect(errors.lineErrors.a.unitPrice).toContain("₺500K");
  });

  it("kalem KAYNAĞI eksik olamaz: stok kartı ya da ad + birim (LINE_SOURCE_REQUIRED)", () => {
    const errors = validatePurchaseRequestForm(
      {
        ...submitReady,
        lines: [
          line({ key: "a", quantity: "1", unitPrice: "1" }),
          line({ key: "b", source: "free", quantity: "1", unitPrice: "1" }),
        ],
      },
      "submit",
    );

    expect(errors.lineErrors.a.stockItemId).toBe(PURCHASE_REQUEST_MESSAGES.stockItemRequired);
    expect(errors.lineErrors.b.freeTextName).toBe(PURCHASE_REQUEST_MESSAGES.freeTextNameRequired);
    expect(errors.lineErrors.b.freeTextUnit).toBe(PURCHASE_REQUEST_MESSAGES.freeTextUnitRequired);
  });

  it("uzunluk tavanları şemadan gelir", () => {
    const errors = validatePurchaseRequestForm(
      {
        ...submitReady,
        justification: "x".repeat(2001),
        lines: [
          line({
            key: "a",
            source: "free",
            freeTextName: "y".repeat(201),
            freeTextUnit: "z".repeat(21),
            quantity: "1",
            unitPrice: "1",
          }),
        ],
      },
      "submit",
    );

    expect(errors.justification).toBe(PURCHASE_REQUEST_MESSAGES.justificationTooLong);
    expect(errors.lineErrors.a.freeTextName).toBe(PURCHASE_REQUEST_MESSAGES.freeTextNameTooLong);
    expect(errors.lineErrors.a.freeTextUnit).toBe(PURCHASE_REQUEST_MESSAGES.freeTextUnitTooLong);
  });
});

describe("firstPurchaseRequestError", () => {
  it("başlık hataları kalem hatalarından ÖNCE gelir (formdaki sıra)", () => {
    const errors = validatePurchaseRequestForm(values({ lines: [line({ key: "a", quantity: "-1" })] }), "submit");

    expect(firstPurchaseRequestError(errors)).toBe(PURCHASE_REQUEST_MESSAGES.projectRequired);
  });

  it("hata yoksa null döner", () => {
    expect(firstPurchaseRequestError({ lineErrors: {} })).toBeNull();
  });
});

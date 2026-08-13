import { describe, it, expect } from "vitest";

import { emptySaleFormValues, type SaleFormValues } from "./form-state";
import { MESSAGES, firstSaleFormError, hasSaleFormErrors, validateSaleForm } from "./validate";

function newCustomerValues(overrides: Partial<SaleFormValues> = {}): SaleFormValues {
  return {
    ...emptySaleFormValues(),
    projectId: "p-2",
    unitId: "u-1",
    customerMode: "new",
    buyerName: "Serkan Öz",
    buyerNationalOrTaxId: "12345678901",
    buyerPhone: "0532 123 45 67",
    salePrice: "1440000",
    ...overrides,
  };
}

describe("validateSaleForm — mockup req yıldızları", () => {
  it("tam dolu yeni-müşteri formu hatasızdır", () => {
    expect(hasSaleFormErrors(validateSaleForm(newCustomerValues()))).toBe(false);
  });

  it("proje ve ünite zorunludur (55)", () => {
    const errors = validateSaleForm(newCustomerValues({ projectId: "", unitId: "" }));
    expect(errors.projectId).toBe(MESSAGES.projectRequired);
    expect(errors.unitId).toBe(MESSAGES.unitRequired);
  });

  it("yeni müşteri kipinde ad / kimlik / telefon zorunludur (71-73)", () => {
    const errors = validateSaleForm(
      newCustomerValues({ buyerName: "", buyerNationalOrTaxId: "", buyerPhone: "" }),
    );
    expect(errors.buyerName).toBe(MESSAGES.buyerNameRequired);
    expect(errors.buyerNationalOrTaxId).toBe(MESSAGES.buyerIdRequired);
    expect(errors.buyerPhone).toBe(MESSAGES.buyerPhoneRequired);
  });

  it("kayıtlı müşteri kipinde inline alanlar ARANMAZ; yalnız seçim istenir", () => {
    const withId = validateSaleForm(
      newCustomerValues({ customerMode: "existing", existingCustomerId: "cus-1", buyerName: "", buyerNationalOrTaxId: "", buyerPhone: "" }),
    );
    expect(withId.buyerName).toBeUndefined();
    expect(withId.buyerPhone).toBeUndefined();
    expect(hasSaleFormErrors(withId)).toBe(false);

    const withoutId = validateSaleForm(
      newCustomerValues({ customerMode: "existing", existingCustomerId: "" }),
    );
    expect(withoutId.existingCustomerId).toBe(MESSAGES.customerRequired);
  });

  it("satış bedeli zorunlu + geçerli sayı; ama ALT SINIR (min_sale_price) YOKTUR", () => {
    expect(validateSaleForm(newCustomerValues({ salePrice: "" })).salePrice).toBe(
      MESSAGES.salePriceRequired,
    );
    expect(validateSaleForm(newCustomerValues({ salePrice: "abc" })).salePrice).toBe(
      MESSAGES.salePriceInvalid,
    );
    // Çok düşük bedel (maliyetin altında) bile GEÇERLİDİR — UI engellemez.
    expect(validateSaleForm(newCustomerValues({ salePrice: "1" })).salePrice).toBeUndefined();
  });

  it("firstSaleFormError öncelik sırasını korur", () => {
    const errors = validateSaleForm(newCustomerValues({ projectId: "", salePrice: "" }));
    expect(firstSaleFormError(errors)).toBe(MESSAGES.projectRequired);
  });
});

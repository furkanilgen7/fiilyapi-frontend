import { describe, expect, it } from "vitest";

import { emptyEquipmentFormValues, type EquipmentFormValues } from "./form-state";
import {
  isPurchaseAmountRequired,
  MESSAGES,
  validateEquipmentForm,
  hasEquipmentFormErrors,
} from "./validate";

function values(overrides: Partial<EquipmentFormValues> = {}): EquipmentFormValues {
  return { ...emptyEquipmentFormValues(), ...overrides };
}

const WITH_SITES = { hasSiteOptions: true };

describe("validateEquipmentForm · mockup yıldızları", () => {
  it("boş form: ad, kategori, alış bedeli ve şantiye hatası verir", () => {
    const errors = validateEquipmentForm(values(), WITH_SITES);
    expect(errors.name).toBe(MESSAGES.nameRequired);
    expect(errors.category).toBe(MESSAGES.categoryRequired);
    expect(errors.purchaseAmount).toBe(MESSAGES.purchaseAmountRequired);
    expect(errors.siteId).toBe(MESSAGES.siteRequired);
    expect(hasEquipmentFormErrors(errors)).toBe(true);
  });

  it("dolu form hatasızdır", () => {
    const errors = validateEquipmentForm(
      values({
        name: "Tower Crane",
        category: "crane",
        purchaseAmount: "3800000",
        siteId: "site-1",
      }),
      WITH_SITES,
    );
    expect(hasEquipmentFormErrors(errors)).toBe(false);
  });

  it("şantiye seçeneği yoksa “Atandığı Proje” zorunlu TUTULMAZ (form kilitlenmez)", () => {
    const errors = validateEquipmentForm(
      values({ name: "X", category: "crane", purchaseAmount: "1" }),
      { hasSiteOptions: false },
    );
    expect(errors.siteId).toBeUndefined();
  });
});

/**
 * 🔴 K8 — `Alış Bedeli` KOŞULLU zorunludur (MK-1 K2). Sunucu 422 döner ama
 * istemci de doğrular: sunucu hatası TEK savunma bırakılmaz.
 */
describe("K8 · Alış Bedeli koşullu zorunluluğu", () => {
  it("`owned` iken zorunludur", () => {
    expect(isPurchaseAmountRequired(values({ ownership: "owned" }))).toBe(true);
    const errors = validateEquipmentForm(
      values({ name: "X", category: "crane", siteId: "s-1", ownership: "owned" }),
      WITH_SITES,
    );
    expect(errors.purchaseAmount).toBe(MESSAGES.purchaseAmountRequired);
  });

  it("`rented` iken SERBESTTİR — kiralık makinenin alış bedeli yoktur", () => {
    expect(isPurchaseAmountRequired(values({ ownership: "rented" }))).toBe(false);
    const errors = validateEquipmentForm(
      values({ name: "X", category: "crane", siteId: "s-1", ownership: "rented" }),
      WITH_SITES,
    );
    expect(errors.purchaseAmount).toBeUndefined();
    expect(hasEquipmentFormErrors(errors)).toBe(false);
  });

  it("`owned` + dolu bedel hatasızdır", () => {
    const errors = validateEquipmentForm(
      values({
        name: "X",
        category: "crane",
        siteId: "s-1",
        ownership: "owned",
        purchaseAmount: "3800000",
      }),
      WITH_SITES,
    );
    expect(errors.purchaseAmount).toBeUndefined();
  });

  it("yalnız boşluktan oluşan bedel DOLU sayılmaz", () => {
    const errors = validateEquipmentForm(
      values({ name: "X", category: "crane", siteId: "s-1", purchaseAmount: "   " }),
      WITH_SITES,
    );
    expect(errors.purchaseAmount).toBe(MESSAGES.purchaseAmountRequired);
  });
});

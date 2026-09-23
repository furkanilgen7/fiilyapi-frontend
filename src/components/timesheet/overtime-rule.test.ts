import { describe, expect, it } from "vitest";

import {
  OVERTIME_MULTIPLIER,
  OVERTIME_MULTIPLIER_TEXT,
  OVERTIME_SURCHARGE_PERCENT_TEXT,
} from "./overtime-rule";

/**
 * BEKÇİ (triyaj #350): panel ("× 1,5") ve giriş şeridi ("%50 zamlı") iki
 * ayrı yerde elle yazılan sabitlerdi. Bu test ikisinin AYNI sayısal
 * çarpandan türediğini kanıtlar — biri değişip diğeri unutulursa kırılır.
 */
describe("overtime-rule · fazla mesai çarpanının tek kaynağı", () => {
  it("TR ondalık metni virgülle yazar", () => {
    expect(OVERTIME_MULTIPLIER_TEXT).toBe("1,5");
  });

  it("yüzde metni çarpandan MATEMATİKSEL olarak türer", () => {
    expect(OVERTIME_SURCHARGE_PERCENT_TEXT).toBe(
      `%${Math.round((OVERTIME_MULTIPLIER - 1) * 100)}`,
    );
  });

  it("bugünkü sözleşme değeri %50'dir (E5 356-358)", () => {
    expect(OVERTIME_SURCHARGE_PERCENT_TEXT).toBe("%50");
  });
});

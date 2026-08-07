// @vitest-environment node
//
// SÖZLEŞME KAPISI — sessiz 422 sınıfı (şantiye formundaki `field-limits.test.ts`
// deseninin aynısı). Sunucu `PersonnelCreate`te `full_name` ve `trade` için
// `maxLength` ilan ediyor; istemcide karşılığı yoksa kullanıcı sınırı aştığında
// HİÇBİR uyarı almadan 422'ye çarpar.
//
// Yalnız UZUNLUK kapsanır: biçim doğrulaması, regex ya da normalleştirme YOK.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { NAME_PART_MAX_LENGTH, PERSONNEL_FIELD_MAX_LENGTH, TRADE_OPTIONS } from "./constants";

const openapi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../openapi/openapi.json", import.meta.url)), "utf8"),
) as {
  components: { schemas: { PersonnelCreate: { properties: Record<string, unknown> } } };
};

/** `PersonnelCreate.<alan>`'ın sözleşmedeki `maxLength`'i (nullable anyOf dahil). */
function contractMaxLength(field: string): number | undefined {
  const schema = openapi.components.schemas.PersonnelCreate.properties[field] as
    | { maxLength?: number; anyOf?: Array<{ maxLength?: number }> }
    | undefined;
  if (!schema) return undefined;
  if (typeof schema.maxLength === "number") return schema.maxLength;
  return schema.anyOf?.find((variant) => typeof variant.maxLength === "number")?.maxLength;
}

describe("PERSONNEL_FIELD_MAX_LENGTH — üretilen sözleşmeyle eşleşir", () => {
  it("haritadaki her sinir openapi.json'daki degerin AYNISIDIR", () => {
    for (const [field, limit] of Object.entries(PERSONNEL_FIELD_MAX_LENGTH)) {
      expect(contractMaxLength(field), `${field} sözleşmede maxLength taşımıyor`).toBe(limit);
    }
  });

  it("sozlesmede maxLength'i olan her alan haritada VARDIR", () => {
    const properties = openapi.components.schemas.PersonnelCreate.properties;
    const missing = Object.keys(properties).filter(
      (field) =>
        contractMaxLength(field) !== undefined && !(field in PERSONNEL_FIELD_MAX_LENGTH),
    );
    expect(missing, `sözleşmede sınırı olup korunmayan alan(lar): ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("Ad/Soyad tek tek sinirlarinin toplami full_name sinirini ASMAZ", () => {
    // İki alan da tavana çarpsa birleşik dize sınırı yalnız BİR boşluk kadar
    // aşabilir; onu da `validate.ts` yakalar.
    expect(NAME_PART_MAX_LENGTH * 2).toBe(PERSONNEL_FIELD_MAX_LENGTH.full_name);
  });

  it("mockup'in sekiz meslek secenegi trade sinirinin altindadir", () => {
    for (const option of TRADE_OPTIONS) {
      expect(option.length).toBeLessThanOrEqual(PERSONNEL_FIELD_MAX_LENGTH.trade);
    }
  });
});

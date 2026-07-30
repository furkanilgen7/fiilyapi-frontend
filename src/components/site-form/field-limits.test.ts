// @vitest-environment node
//
// SÖZLEŞME KAPISI — sessiz 422 sınıfı (plan kapanış maddesi 5, 2026-07-30).
//
// Sunucu `SiteCreate`'te on metin alanı için `maxLength` ilan ediyor. İstemcide
// karşılığı yoksa kullanıcı sınırı aştığında HİÇBİR uyarı almadan 422'ye
// çarpıyor. Bu test iki yönlü çalışır:
//
//   1. Bizim sabitlerimiz sözleşmedeki değerle AYNI mı? (elle yazılmış sayı yok)
//   2. Sözleşmede maxLength'i olup bizim haritada OLMAYAN alan var mı?
//      (yeni sürümde eklenen bir sınır sessizce gözden kaçmasın)
//
// Yalnız UZUNLUK kapsanır: biçim doğrulaması ve yeni hata metni YOKTUR.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { SITE_FIELD_MAX_LENGTH } from "./constants";

const openapi = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../openapi/openapi.json", import.meta.url)), "utf8"),
) as {
  components: { schemas: { SiteCreate: { properties: Record<string, unknown> } } };
};

/** `SiteCreate.<alan>`'ın sözleşmedeki `maxLength`'i (nullable anyOf dahil). */
function contractMaxLength(field: string): number | undefined {
  const schema = openapi.components.schemas.SiteCreate.properties[field] as
    | { maxLength?: number; anyOf?: Array<{ maxLength?: number }> }
    | undefined;
  if (!schema) return undefined;
  if (typeof schema.maxLength === "number") return schema.maxLength;
  return schema.anyOf?.find((variant) => typeof variant.maxLength === "number")?.maxLength;
}

/**
 * Formda KONTROLÜ OLMAYAN, bu yüzden istemci koruması gerekmeyen alanlar.
 * `site_manager_name`: gövdeye İSTEMCİDEN gitmez — sunucu FK'den anlık görüntü
 * yazar (spec §9.3 "Gönderilmeyen alanlar").
 */
const CONTROL_LESS_FIELDS = new Set(["site_manager_name"]);

describe("SITE_FIELD_MAX_LENGTH — üretilen sözleşmeyle eşleşir", () => {
  it("haritadaki her sinir openapi.json'daki degerin AYNISIDIR", () => {
    for (const [field, limit] of Object.entries(SITE_FIELD_MAX_LENGTH)) {
      expect(contractMaxLength(field), `${field} sözleşmede maxLength taşımıyor`).toBe(limit);
    }
  });

  it("sozlesmede maxLength'i olan her form alani haritada VARDIR", () => {
    const properties = openapi.components.schemas.SiteCreate.properties;
    const missing = Object.keys(properties).filter(
      (field) =>
        contractMaxLength(field) !== undefined &&
        !CONTROL_LESS_FIELDS.has(field) &&
        !(field in SITE_FIELD_MAX_LENGTH),
    );
    expect(missing, `sözleşmede sınırı olup korunmayan alan(lar): ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("on alanin tamamini kapsar (GPS dahil)", () => {
    expect(Object.keys(SITE_FIELD_MAX_LENGTH).sort()).toEqual([
      "address",
      "city",
      "code",
      "electricity_subscription_no",
      "floor_info",
      "gps_coordinates",
      "name",
      "neighborhood",
      "parcel",
      "water_subscription_no",
    ]);
  });
});

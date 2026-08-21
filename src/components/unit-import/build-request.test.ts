import { describe, expect, it } from "vitest";

import {
  buildImportFields,
  emptyUnitImportFormValues,
  type UnitImportFormValues,
} from "./build-request";

function values(overrides: Partial<UnitImportFormValues> = {}): UnitImportFormValues {
  return { ...emptyUnitImportFormValues(), projectId: "prj-1", siteId: "site-1", ...overrides };
}

describe("buildImportFields — 🔴 GUARD 4 (KARŞITI): `site_id` BURAYA AİTTİR", () => {
  it("EI 61 şantiyesi GERÇEK bir gövde alanıdır ve gönderilir", () => {
    expect(buildImportFields(values()).site_id).toBe("site-1");
  });

  it("EI 60 projesi PATH parametresidir; gövdeye GİRMEZ", () => {
    const fields = buildImportFields(values());
    expect(fields).not.toHaveProperty("project_id");
    expect(fields).not.toHaveProperty("projectId");
  });

  it("şantiye seçilmemişse anahtar HİÇ kurulmaz (yeni blok açılmayan dosyada gereksizdir)", () => {
    expect(buildImportFields(values({ siteId: "" }))).not.toHaveProperty("site_id");
  });
});

describe("buildImportFields — EI 192 kutucuğu", () => {
  it("mockup'ta İŞARETLİ ve şema varsayılanı da true", () => {
    expect(emptyUnitImportFormValues().includeWarnings).toBe(true);
    expect(buildImportFields(values()).include_warnings).toBe(true);
  });

  it("kapatılınca false gider — anahtar DÜŞÜRÜLMEZ", () => {
    const fields = buildImportFields(values({ includeWarnings: false }));
    expect(fields.include_warnings).toBe(false);
    expect(Object.keys(fields)).toContain("include_warnings");
  });
});

describe("buildImportFields — dosya bu katmanda TAŞINMAZ", () => {
  it("`file` anahtarı üretilmez (File nesnesi bileşen durumunda kalır)", () => {
    expect(buildImportFields(values())).not.toHaveProperty("file");
  });

  it("anahtar kümesi en fazla iki alandır", () => {
    expect(Object.keys(buildImportFields(values())).sort()).toEqual([
      "include_warnings",
      "site_id",
    ]);
    expect(Object.keys(buildImportFields(values({ siteId: "" })))).toEqual(["include_warnings"]);
  });
});

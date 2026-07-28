// @vitest-environment node
// Tarama testi: form etiketleri tek primitive'de (ui/field/Field) toplanmis
// kalmali. Ekranlar kendi `.*__label` kuralini veya ham <label htmlFor> alanini
// geri getirirse bu test kirilir.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(srcDir).filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f));
const read = (f: string) => readFileSync(f, "utf8");
const rel = (f: string) => path.relative(srcDir, f);

/** Field'e tasindigi icin bir daha tanimlanmamasi gereken yerel etiket sinif/kurallari. */
const RETIRED_LABEL_RULES = [
  "settings-field__label",
  "company-field__label",
  "pref-field__label",
  "backup-field__label",
  ".login-field label",
];

describe("form etiketi tek primitive'de toplanmis", () => {
  it("emekliye ayrilan yerel etiket kurallari geri gelmemis", () => {
    for (const rule of RETIRED_LABEL_RULES) {
      const offenders = files.filter((f) => read(f).includes(rule)).map(rel);
      expect(offenders, `${rule} artik kullanilmamali (ui/field/Field kullan)`).toEqual([]);
    }
  });

  it("etiket-kontrol baglantisi yalnizca Field icinde kurulur", () => {
    // htmlFor tek yerde: baglantiyi ekranlarin elle (id uydurarak) kurmasini engeller.
    const offenders = files.filter((f) => read(f).includes("htmlFor")).map(rel);
    expect(offenders).toEqual(["components/ui/field/Field.tsx"]);
  });

  it("etiket tipografisi yalnizca field.css'te tanimlanir", () => {
    // Tanim disinda hicbir ekran bu token'lari kendi etiket kuralinda kullanmamali.
    for (const token of ["--text-form-label", "--text-form-hint"]) {
      const offenders = files
        .filter((f) => !f.endsWith(path.join("styles", "tokens.css")))
        .filter((f) => read(f).includes(`var(${token})`))
        .map(rel);
      expect(offenders, `${token} yalnizca field.css icinde kullanilmali`).toEqual([
        "components/ui/field/field.css",
      ]);
    }
  });
});

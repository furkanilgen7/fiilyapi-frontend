// @vitest-environment node
// `bulk-unit-form.css.test.ts` / `unit-import.css.test.ts` ile aynı gerekçe:
// dosya sistemi okuyan saf METİN testi. Kuralın stylesheet'te VAR olduğunu
// doğrular; cascade'i/tarayıcı görünümünü DOĞRULAMAZ (görsel doğrulama görsel
// kapının işi). Amaç PG'ye bağlı renk/ölçü kararlarının sessizce silinmesine
// karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./land-share-allocation.css", import.meta.url)),
  "utf8",
);

describe("land-share-allocation.css — PG ölçüleri", () => {
  it("PG 45 içerik sütunu 1050px'tir (ortak 1000px'ten SAPAR)", () => {
    expect(css).toMatch(/\.pg-page\s*{[^}]*max-width:\s*1050px/);
  });

  it("PG 61 sözleşme kutusu SALT OKUNUR görünümdedir (gri zemin + mono)", () => {
    expect(css).toMatch(/\.pg-contract-box\s*{[^}]*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.pg-contract-box\s*{[^}]*var\(--font-mono\)/);
  });

  it("PG 65/73 iki kutucuk AYRI tondadır (teal ↔ amber)", () => {
    expect(css).toMatch(/\.pg-tile--ratio\s*{[^}]*var\(--color-accent-teal-tint\)/);
    expect(css).toMatch(/\.pg-tile--state\s*{[^}]*var\(--color-amber-tint-cell\)/);
  });

  it("PG 67/75 oran şeridi 34px yüksekliğinde ve taşmayı KIRPAR", () => {
    const rule = css.match(/\.pg-bar\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/height:\s*34px/);
    expect(rule).toMatch(/overflow:\s*hidden/);
  });

  it("PG 106 liste kartı kenardan kenaradır (padding 0 + overflow hidden)", () => {
    expect(css).toMatch(/\.pg-flush-card\s*{[^}]*padding:\s*0/);
    expect(css).toMatch(/\.pg-flush-card\s*{[^}]*overflow:\s*hidden/);
  });

  it("PG 126 'Sahiplik Ataması' başlığı VURGULUDUR (700 + teal)", () => {
    const rule = css.match(/\.pg-units-table th\.pg-units-table__own\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/var\(--weight-bold\)/);
    expect(rule).toMatch(/var\(--color-accent-teal-start\)/);
  });

  it("PG 186/218 seçili taraf AYRI renktedir — teal YALNIZ bizim payımızındır", () => {
    expect(css).toMatch(/\.pg-side__btn--on-ours\s*{[^}]*var\(--color-accent-teal-start\)/);
    const owner = css.match(/\.pg-side__btn--on-owner\s*{[^}]*}/)?.[0] ?? "";
    expect(owner).toMatch(/var\(--color-text-muted\)/);
    expect(owner).not.toMatch(/teal/);
  });

  it("PG 130/166 satır zeminleri: atanmayan amber, bizim teal", () => {
    const unassigned = css.match(/tbody tr\.pg-row--unassigned\s*{[^}]*}/)?.[0] ?? "";
    const ours = css.match(/tbody tr\.pg-row--ours\s*{[^}]*}/)?.[0] ?? "";
    expect(unassigned).toMatch(/var\(--color-amber-tint-cell\)/);
    expect(ours).toMatch(/var\(--color-accent-teal-tint\)/);
  });

  it("🔴 hüküm şeridinin ÜÇ tonu da tanımlıdır ve hesaplanamaz hâl NÖTRDÜR", () => {
    // Yeşil "denge uygun", kırmızı "denge bozuk" derdi; sunucu hesaplanamaz
    // hâlde İKİSİNİ DE söylemiyor — bu yüzden üçüncü ton ne yeşil ne kırmızıdır.
    expect(css).toMatch(/\.pg-verdict--ok\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.pg-verdict--off\s*{[^}]*var\(--color-danger\)/);
    const neutral = css.match(/\.pg-verdict--uncomputable\s*{[^}]*}/)?.[0] ?? "";
    expect(neutral).not.toMatch(/success|danger/);
    expect(neutral).toMatch(/var\(--color-text-subtle\)/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

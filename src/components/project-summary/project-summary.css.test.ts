// @vitest-environment node
// `land-share-allocation.css.test.ts` emsali: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (o görsel kapının işi). Amaç KY/KK/KKP'ye bağlı
// renk ve ölçü kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./project-summary.css", import.meta.url)), "utf8");

/** Yorumlar sökülür: kural KODA uygulanır (bar-ratio testindeki aynı ders). */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("project-summary.css — tür renkleri", () => {
  it("KY hero'su MOR gradyandir (kendi yatirim)", () => {
    const rule = rules.match(/\.psum-hero\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/--color-accent-purple-deep/);
    expect(rule).toMatch(/--color-accent-purple-grad-end/);
  });

  it("KK hero'su TEAL gradyandir — iki tur AYRI renktedir", () => {
    const rule = rules.match(/\.psum-hero--kat_karsiligi\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/--color-accent-teal-start/);
    expect(rule).toMatch(/--color-accent-teal-light/);
  });

  it("KKP 100/109 iki sahip rozeti AYRI tondadir (BIZ teal, ARSA notr)", () => {
    expect(rules).toMatch(/\.psum-side--contractor\s*{[^}]*--color-accent-teal-start/);
    expect(rules).toMatch(/\.psum-side--landowner\s*{[^}]*--color-text-subtle/);
  });
});

describe("project-summary.css — ölçüler", () => {
  it("KY 92 maliyet cubugu 7px ve tasmayi KIRPAR", () => {
    const rule = rules.match(/\.psum-cost__bar\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/height:\s*7px/);
    expect(rule).toMatch(/overflow:\s*hidden/);
  });

  it("genis tablolar KENDI icinde yatay kaydirir (govde kaymaz)", () => {
    expect(rules).toMatch(/\.psum-tbl__scroll\s*{[^}]*overflow-x:\s*auto/);
  });

  it("para sutunlari TABULAR rakam kullanir (hizalama kaymaz)", () => {
    expect(rules).toMatch(/\.psum-tbl__num\s*{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

/**
 * 🔴 CLAUDE.md: "yeni renk/spacing gerekiyorsa mockup değerini token'a çevir;
 * ÇIPLAK HEX YASAK". Bekçi KODU tarar — dosyanın kendi açıklama cümlesindeki
 * hex örneği yasağı tetiklememeli (yorum sökücünün varlık sebebi).
 */
describe("project-summary.css — çıplak hex yasağı", () => {
  it("yorum sokucu KURALLARI birakir (saglik kontrolu)", () => {
    expect(rules).toMatch(/\.psum-hero\s*{/);
  });

  it("hicbir kuralda ciplak hex YOKTUR", () => {
    const offenders = rules.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(offenders).toEqual([]);
  });
});

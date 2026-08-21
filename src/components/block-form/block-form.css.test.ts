// @vitest-environment node
// `sales-form.css.test.ts` emsali: saf METİN testi — BE'ye bağlı renk/ölçü
// kararlarının sessizce silinmesine karşı regresyon.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./block-form.css", import.meta.url)), "utf8");

describe("block-form.css — BE mockup'ına bağlı kurallar", () => {
  it("içerik sütunu 900px'tir — ortak 1000px token'ı BE için geçerli DEĞİL (44)", () => {
    expect(css).toMatch(/\.be-page\.pf\s*{[^}]*max-width:\s*900px/);
  });

  it("tahmin paneli mavi tint zemindir (88)", () => {
    expect(css).toMatch(/\.be-estimate\s*{[^}]*var\(--color-nav-active-bg\)/);
  });

  it("panel başlığı koyu mavi, alt yazısı açık mavidir (90-91)", () => {
    expect(css).toMatch(/\.be-estimate__label\s*{[^}]*var\(--color-primary-hover\)/);
    expect(css).toMatch(/\.be-estimate__caption\s*{[^}]*var\(--color-primary-light\)/);
  });

  it("tahmin SAYISI 22px mono primary'dir (93)", () => {
    expect(css).toMatch(/\.be-estimate__value\s*{[^}]*font-size:\s*22px/);
    expect(css).toMatch(/\.be-estimate__value\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.be-estimate__value\s*{[^}]*var\(--color-primary\)/);
  });

  it("toplu üretim kutucuğu kendi gerekçesini alta dizer (107-110)", () => {
    expect(css).toMatch(/\.be-bulk\s*{[^}]*flex-direction:\s*column/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

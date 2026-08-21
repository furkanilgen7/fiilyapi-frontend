// @vitest-environment node
// `sales-form.css.test.ts` emsali: saf METİN testi — UE'ye bağlı renk/ölçü
// kararlarının sessizce silinmesine karşı regresyon.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./unit-form.css", import.meta.url)), "utf8");

describe("unit-form.css — UE mockup'ına bağlı kurallar", () => {
  it("içerik sütunu 960px'tir — BE'nin 900px'inden FARKLI (47)", () => {
    expect(css).toMatch(/\.ue-page\.pf\s*{[^}]*max-width:\s*960px/);
  });

  it("türev kutusu gri zemin + gri metindir (89 readonly)", () => {
    expect(css).toMatch(/\.ue-derived\s*{[^}]*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.ue-derived\s*{[^}]*var\(--color-text-muted\)/);
  });

  it("beklenen kâr bandı yeşil tint zemin + yeşil formül satırıdır (97-98)", () => {
    expect(css).toMatch(/\.ue-profit\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.ue-profit__formula\s*{[^}]*var\(--color-success-deep\)/);
  });

  it("🔴 kâr TUTARI yeşil DEĞİL gridir — hesaplanamayan sayı yeşil basılmaz", () => {
    // Mockup 99 tutarı `#16a34a` (yeşil) çizer; maliyet sütunu olmadığı için
    // (KARAR 3) o sayı BASILAMAZ ve yeşil bir "—" kullanıcıyı yanıltırdı.
    const valueRule = css.match(/\.ue-profit__value\s*{[^}]*}/)?.[0] ?? "";
    expect(valueRule).toMatch(/var\(--color-text-muted\)/);
    expect(valueRule).not.toMatch(/var\(--color-success\)/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

// @vitest-environment node
// `sales-form.css.test.ts` ile aynı gerekçe: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (görsel doğrulama T6'nın işi). Amaç BE/UE'ye bağlı
// renk/ölçü kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./unit-shell.css", import.meta.url)), "utf8");

describe("unit-shell.css — BE/UE ortak şerit kuralları", () => {
  it("sekme şeridi beyaz zemin + kenarlık + fit-content genişliktir (BE 47)", () => {
    expect(css).toMatch(/\.uf-tabs\s*{[^}]*var\(--color-surface\)/);
    expect(css).toMatch(/\.uf-tabs\s*{[^}]*width:\s*fit-content/);
  });

  it("aktif sekme mavi tint zemin + primary metindir (BE 48 `.tab-on`)", () => {
    expect(css).toMatch(/\.uf-tabs__tab--active\s*{[^}]*var\(--color-primary\)/);
    expect(css).toMatch(/\.uf-tabs__tab--active\s*{[^}]*var\(--color-nav-active-bg\)/);
  });

  it("devre-dışı sekme soluk tonda ve tıklanamaz imleçlidir (BE 50-52)", () => {
    expect(css).toMatch(/\.uf-tabs__tab--disabled\s*{[^}]*var\(--color-text-subtle\)/);
    expect(css).toMatch(/\.uf-tabs__tab--disabled\s*{[^}]*cursor:\s*not-allowed/);
  });

  it("sayısal kutular mono ailede ve SAĞA yaslıdır (BE 78-85 · UE 76-92)", () => {
    expect(css).toMatch(/\.uf-num\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.uf-num\s*{[^}]*text-align:\s*right/);
  });

  it("blok kodu mono ama SOLA yaslıdır (BE 71 — `text-align` yazmaz)", () => {
    const monoRule = css.match(/\.uf-mono\s*{[^}]*}/)?.[0] ?? "";
    expect(monoRule).toMatch(/var\(--font-mono\)/);
    expect(monoRule).not.toMatch(/text-align/);
  });

  it("pending gerekçe metni için ayrı bir sınıf vardır (görünür, title değil)", () => {
    expect(css).toMatch(/\.uf-pending-reason\s*{[^}]*var\(--text-small\)/);
    expect(css).toMatch(/\.uf-tabs__note\s*{[^}]*var\(--text-small\)/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

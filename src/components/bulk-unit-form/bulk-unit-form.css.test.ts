// @vitest-environment node
// `unit-shell.css.test.ts` ile aynı gerekçe: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (görsel doğrulama görsel kapının işi). Amaç TU'ya
// bağlı renk/ölçü kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./bulk-unit-form.css", import.meta.url)), "utf8");

describe("bulk-unit-form.css — TU ölçüleri", () => {
  it("TU 73 türev kutusu yeşil zemin + yeşil kalın metin + SAĞA yaslıdır", () => {
    expect(css).toMatch(/\.tu-total\s*{[^}]*var\(--color-success-tint\)/);
    expect(css).toMatch(/\.tu-total\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.tu-total\s*{[^}]*text-align:\s*right/);
  });

  it("TU 91/143 kartları kenardan kenaradır (padding 0 + overflow hidden)", () => {
    expect(css).toMatch(/\.tu-flush-card\s*{[^}]*padding:\s*0/);
    expect(css).toMatch(/\.tu-flush-card\s*{[^}]*overflow:\s*hidden/);
  });

  it("TU 148 önizleme tablosu KENDİ İÇİNDE kaydırılır (280px)", () => {
    expect(css).toMatch(/\.tu-preview__scroll\s*{[^}]*max-height:\s*280px/);
    expect(css).toMatch(/\.tu-preview__scroll\s*{[^}]*overflow-y:\s*auto/);
  });

  it("TU 150 önizleme başlığı YAPIŞKANDIR (kaydırırken sütun adı kaybolmaz)", () => {
    expect(css).toMatch(/\.tu-preview-table thead th\s*{[^}]*position:\s*sticky/);
  });

  it("TU 143/170 önizleme kartı YEŞİL çerçeveli, toplam şeridi yeşil üst çizgilidir", () => {
    expect(css).toMatch(/\.tu-preview\s*{[^}]*var\(--color-success-tint-border\)/);
    expect(css).toMatch(/\.tu-preview__foot\s*{[^}]*border-top:\s*2px solid var\(--color-success\)/);
  });

  it("çakışan satır AMBER'dır — kırmızı DEĞİL (önizlemede çakışma hata değildir)", () => {
    const rule = css.match(/\.tu-preview-row--conflict\s*{[^}]*}/)?.[0] ?? "";
    expect(rule).toMatch(/var\(--color-amber-tint-cell\)/);
    expect(rule).not.toMatch(/danger/);
  });

  it("TU 176 dikkat şeridi amber zemin + amber kenar + koyu amber metindir", () => {
    expect(css).toMatch(/\.tu-warning\s*{[^}]*var\(--color-amber-tint-cell\)/);
    expect(css).toMatch(/\.tu-warning\s*{[^}]*var\(--color-warning-border-soft\)/);
    expect(css).toMatch(/\.tu-warning\s*{[^}]*var\(--color-warning-deep-text\)/);
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

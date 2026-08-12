// @vitest-environment node
// stock.css.test.ts ile aynı gerekçe: dosya sistemi okuyan saf METİN testi.
// Yalnızca kuralın stylesheet'te VAR olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T5'in işi). Amaç, SG'ye
// bağlı renk/ölçü kararlarının sessizce silinmesine karşı regresyondur.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./stock-entry-form.css", import.meta.url)),
  "utf8",
);

describe("stock-entry-form.css — SG mockup'ına bağlı kurallar", () => {
  it("seçili giriş tipi kartı YEŞİLDİR (55/57/58 — proje formunun mavisi DEĞİL)", () => {
    expect(css).toMatch(
      /\.sgf-type-card--selected\s*{[^}]*var\(--color-success\)[^}]*var\(--color-success-tint\)/,
    );
    expect(css).toMatch(
      /\.sgf-type-card--selected \.sgf-type-card__title\s*{[^}]*var\(--color-success-deep\)/,
    );
  });

  it("'Gelen' sütunu vurgulu yeşildir (103/114)", () => {
    expect(css).toMatch(/\.sgf-table__accent\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(
      /\.sgf-table__input--accent\s*{[^}]*var\(--color-success-tint\)/,
    );
  });

  it("toplam şeridi yeşil zemin + üstten 2px yeşil çizgidir (140-142)", () => {
    expect(css).toMatch(
      /\.sgf-table tfoot tr\s*{[^}]*var\(--color-success-tint\)[^}]*2px solid var\(--color-success\)/,
    );
  });

  it("sayısal hücreler mono ailededir (114-116, 142)", () => {
    for (const selector of ["sgf-table__amount", "sgf-table__input", "sgf-mono"]) {
      expect(css, selector).toMatch(
        new RegExp(`\\.${selector}\\s*{[^}]*var\\(--font-mono\\)`),
      );
    }
  });

  it("çıplak hex renk yoktur (token zorunluluğu)", () => {
    // Yorumlar mockup'ın hex değerlerini GEREKÇE olarak taşır; kural
    // metninde hex arandığı için önce yorumlar çıkarılır.
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

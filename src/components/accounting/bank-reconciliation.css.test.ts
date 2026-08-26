// @vitest-environment node
// `accounting.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./bank-reconciliation.css", import.meta.url)),
  "utf8",
);

describe("bank-reconciliation.css — BM'ye bağlı kurallar", () => {
  it("özet ÜÇ eşit karttır (BM:86)", () => {
    expect(css).toMatch(/\.bm-cards\s*{[^}]*grid-template-columns:\s*repeat\(3, 1fr\)/);
  });

  it("gövde İKİ eşit paneldir (BM:106)", () => {
    expect(css).toMatch(/\.bm-grid\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
  });

  it("kart değeri kalın MONO'dur (BM:89)", () => {
    expect(css).toMatch(/\.bm-card__value\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.bm-card__value\s*{[^}]*var\(--weight-bold\)/);
  });

  it("🔴 ucu OLMAYAN kart NÖTR zeminlidir, YEŞİL 'mutabık' zemini YOKTUR", () => {
    // BM:98-104 yeşil bir `✓ Mutabık` kutusu çizer. O zemin basılsaydı
    // kullanıcı hesapların TUTTUĞUNU sanardı — mutabakat hiç koşmamışken.
    expect(css).toMatch(/\.bm-card--disabled\s*{[^}]*var\(--color-surface-2\)/);
    expect(css).not.toMatch(/\.bm-card--disabled\s*{[^}]*success/);
  });

  it("çıplak hex renk YOKTUR (palet YALNIZ token'dan)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

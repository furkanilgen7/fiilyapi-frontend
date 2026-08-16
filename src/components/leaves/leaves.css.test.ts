// @vitest-environment node
// `hr-documents.css.test.ts` ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./leaves.css", import.meta.url)), "utf8");

describe("leaves.css — İZ mockup'ına bağlı kurallar", () => {
  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("KPI kartlarının sol kenarlıkları mockup rengindedir (46, 50)", () => {
    expect(css).toMatch(/\.iz-kpi__card--pending\s*{[^}]*var\(--color-warning\)/);
    expect(css).toMatch(/\.iz-kpi__card--risk\s*{[^}]*var\(--color-danger\)/);
  });

  it("bekleyen talep kartının başlığı kehribar zemin + koyu kehribar metindir (55-57)", () => {
    expect(css).toMatch(/\.iz-card__head--warning\s*{[^}]*var\(--color-amber-tint-cell\)/);
    expect(css).toMatch(/\.iz-card__title--warning\s*{[^}]*var\(--color-warning-deep-text\)/);
    expect(css).toMatch(/\.iz-card__hint--warning\s*{[^}]*var\(--color-warning-body-text\)/);
  });

  it("iki vurgulu satır zemini de tanımlıdır: hak aşımı (91) ve devreden riski (151)", () => {
    expect(css).toMatch(/\.iz-table__row--overrun\s*{[^}]*var\(--color-audit-danger-row-bg\)/);
    expect(css).toMatch(/\.iz-table__row--risk\s*{[^}]*var\(--color-amber-tint-cell\)/);
  });

  it("'Kalan Hak' hücresinin DÖRT tonu da ayrı tanımlıdır (77/87/97)", () => {
    for (const tone of ["ok", "unknown", "exceeded", "not-deducted"]) {
      expect(css).toMatch(new RegExp(`\\.iz-remaining--${tone}\\s*{`));
    }
  });

  it("'bilinmiyor' ve 'hak yok' hücreleri YEŞİL/KALIN basılmaz (sayı sanılmasın)", () => {
    expect(css).toMatch(/\.iz-remaining--unknown\s*{[^}]*var\(--color-text-subtle\)/);
    expect(css).toMatch(/\.iz-balance-remaining--none\s*{[^}]*var\(--color-text-subtle\)/);
  });

  it("pasif onay düğmesi tıklanabilir görünmez (99)", () => {
    expect(css).toMatch(/\.iz-action:disabled\s*{[^}]*cursor:\s*not-allowed/);
  });

  it("kullanım çubuğunun genişliği CSS değişkeninden gelir (çıplak px yok)", () => {
    expect(css).toMatch(/\.iz-bar__fill\s*{[^}]*width:\s*var\(--iz-bar-pct/);
  });
});

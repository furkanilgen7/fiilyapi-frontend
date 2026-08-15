// @vitest-environment node
// KAPSAM UYARISI (employer-contract-detail.css.test.ts ile aynı): bu dosya
// YALNIZCA stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T3/T8'in işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./contract-item-form.css", import.meta.url)),
  "utf8",
);

describe("contract-item-form.css — Poz Ekle mockup'larına bağlı kurallar", () => {
  it("form iki kolonludur: 1fr + 320px (TAŞ 87 · İŞV 97)", () => {
    expect(css).toMatch(/\.pif\s*{[^}]*grid-template-columns:\s*1fr 320px/s);
  });

  it("dar ekranda özet rayı gizlenmez, tek kolona düşer", () => {
    expect(css).toMatch(/@media \(max-width: 800px\)\s*{[^@]*grid-template-columns:\s*1fr;/s);
  });

  it("birim fiyat kutusu kehribar zemin + sarı kenarlık taşır (TAŞ 140)", () => {
    expect(css).toMatch(
      /\.pif-price\s*{[^}]*var\(--color-amber-tint-cell\)[^}]*var\(--color-warning-border-soft\)/s,
    );
  });

  it("fiyatsız poz uyarısı turuncudur (TAŞ 23 `.hint-warn` · 143)", () => {
    expect(css).toMatch(/\.pif-warn\s*{[^}]*var\(--color-warning-strong\)/s);
  });

  it("`Fiyatlanmadı` rozeti kehribar zeminde beyaz metindir (TAŞ 170)", () => {
    expect(css).toMatch(
      /\.pif-summary__status-badge\s*{[^}]*var\(--color-warning-strong\)[^}]*var\(--color-on-brand\)/s,
    );
  });

  it("işveren bedel kutusu MAVİdir — taşeronun gri kutusu DEĞİL (İŞV 169)", () => {
    expect(css).toMatch(/\.pif-total\s*{[^}]*var\(--color-surface-2\)/s);
    expect(css).toMatch(/\.pif-total--employer\s*{[^}]*var\(--color-info-tint\)/s);
  });

  it("iş kuralı bandı yeşildir (İŞV 88)", () => {
    expect(css).toMatch(
      /\.pif-rule\s*{[^}]*var\(--color-success-tint\)[^}]*var\(--color-success-tint-border\)/s,
    );
  });

  it("çıplak hex kullanılmaz (renkler token'dan gelir)", () => {
    // Yorumlardaki mockup renk NOTLARI (`/* #fffbeb — 140 */`) kural değildir.
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

// @vitest-environment node
// Not: employer-contract-detail.css.test.ts ile aynı gerekçe ve aynı KAPSAM
// UYARISI — bu dosya yalnız stylesheet METNİNİ doğrular, cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T8'in işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./contract-distribution.css", import.meta.url)),
  "utf8",
);

describe("contract-distribution.css — POZ mockup'ına bağlı kurallar", () => {
  it("açıklama bandı mavi tint + 12px köşe taşır (32)", () => {
    expect(css).toMatch(/\.cdist-intro\s*{[^}]*var\(--color-nav-active-bg\)[^}]*var\(--radius-lg\)/s);
  });

  it("dağıtılmamış uyarı bandı kehribar zemin + koyu kehribar metindir (63-65)", () => {
    expect(css).toMatch(
      /\.cdist-warning\s*{[^}]*var\(--color-orange-tint\)[^}]*var\(--color-warning-deep-text\)/s,
    );
  });

  it("kalan varsa rozet KIRMIZIdır — E14'ün kehribarı DEĞİL (161)", () => {
    expect(css).toMatch(
      /\.cdist-grid__remaining--open\s*{[^}]*var\(--color-danger-soft\)[^}]*var\(--color-danger-strong\)/s,
    );
  });

  it("dağıtılmamış satırın zemini kırmızımsıdır (153)", () => {
    expect(css).toMatch(
      /\.cdist-grid__row--undistributed\s*{[^}]*var\(--color-audit-danger-row-bg\)/s,
    );
  });

  it("ilk iki şantiye tonu mockup'la birebirdir (82-83 mavi/yeşil)", () => {
    expect(css).toMatch(/\.cdist-accent-0\s*{[^}]*var\(--color-nav-active-bg\)/s);
    expect(css).toMatch(/\.cdist-accent-1\s*{[^}]*var\(--color-success-tint\)/s);
  });

  it("kota girdisi 80px genişlikte, sağa dayalı ve monodur (12 · .dist-input)", () => {
    expect(css).toMatch(
      /\.cdist-cell \.input\s*{[^}]*var\(--cdist-cell-width\)[^}]*text-align:\s*right[^}]*var\(--font-mono\)/s,
    );
  });

  it("özet kartları iki kolonlu ızgaradır (168)", () => {
    expect(css).toMatch(/\.cdist-summaries\s*{[^}]*grid-template-columns:\s*1fr 1fr/s);
  });

  it("çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

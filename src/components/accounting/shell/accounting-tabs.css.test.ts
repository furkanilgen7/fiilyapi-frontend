// @vitest-environment node
// `accounting.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin testi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./accounting-tabs.css", import.meta.url)), "utf8");

describe("accounting-tabs.css — MP:105-112", () => {
  it("şerit İÇERİK KADAR geniştir, satırı KAPLAMAZ (MP:105)", () => {
    expect(css).toMatch(/\.mu-tabs\s*{[^}]*width:\s*fit-content/);
  });

  it("yuva gri, seçili hap BEYAZ zeminlidir (MP:105-106)", () => {
    expect(css).toMatch(/\.mu-tabs\s*{[^}]*background:\s*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.mu-tabs__pill--active\s*{[^}]*background:\s*var\(--color-surface\)/);
  });

  it("seçili hap gölgeyle yuvadan KALKAR ve MAVİdir (MP:106)", () => {
    expect(css).toMatch(/\.mu-tabs__pill--active\s*{[^}]*var\(--shadow-tab-active\)/);
    expect(css).toMatch(/\.mu-tabs__pill--active\s*{[^}]*color:\s*var\(--color-primary\)/);
  });

  it("🔴 devre dışı hap SİLİNMEZ: kendi kuralı vardır ve GİZLENMEZ", () => {
    expect(css).toMatch(/\.mu-tabs__pill--disabled\s*{/);
    expect(css).not.toMatch(/\.mu-tabs__pill--disabled\s*{[^}]*display:\s*none/);
  });

  it("gerekçe satırı EKRANDADIR (gizlenmez)", () => {
    expect(css).toMatch(/\.mu-tabs__reason\s*{/);
    expect(css).not.toMatch(/\.mu-tabs__reason\s*{[^}]*display:\s*none/);
  });

  it("bağlantı hap'ında görünür odak halkası vardır", () => {
    expect(css).toMatch(/a\.mu-tabs__pill:focus-visible\s*{[^}]*var\(--focus-ring\)/);
  });

  it("çıplak hex renk YOKTUR (palet YALNIZ token'dan)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

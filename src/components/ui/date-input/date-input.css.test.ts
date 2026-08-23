// @vitest-environment node
// Saf metin (CSS kaynak) testi — `accounting-shell.css.test.ts` ile aynı
// gerekçe: kuralın METİNDE var olduğunu doğrular, cascade'i doğrulamaz
// (görsel doğrulama 5. kapının işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./date-input.css", import.meta.url)),
  "utf8",
);

describe("date-input.css", () => {
  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });

  it("takvim düğmesi FARE İMLECİNİ alır ama yazı imlecini bozmaz", () => {
    expect(css).toMatch(/\.date-input-trigger\s*{[^}]*cursor:\s*pointer/);
  });

  it("🔴 gizli seçici girdisi AKIŞTAN ÇIKARILIR (yükseklik/hizayı bozmaz)", () => {
    // Akışta kalsaydı sarmalayıcıyı büyütür, 22 karede kutu ölçüsü kayardı.
    expect(css).toMatch(/\.date-input-picker\s*{[^}]*position:\s*absolute/);
  });

  it("🔴 gizli seçici girdisi GÖRÜNMEZDİR", () => {
    expect(css).toMatch(/\.date-input-picker\s*{[^}]*opacity:\s*0/);
  });

  it("takvim düğmesi metnin üstüne binmez — sağ iç boşluk ona yer açar", () => {
    expect(css).toMatch(/\.date-input\s*{[^}]*padding-right:/);
  });
});

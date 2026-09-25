// sales-form.css.test.ts ile AYNI gerekçe: dosya sistemi okuyan saf METİN
// testi. Kuralın stylesheet'te VAR olduğunu doğrular; cascade'i/tarayıcı
// görünümünü DOĞRULAMAZ (görsel doğrulama Playwright'ın işi — bkz.
// `e2e/weekly-qurr-visual.spec.ts` "formul baloncugu" karesi).
//
// LİDER DENETİMİ (ölçüldü, PLN-F3.6b): `.qurr-formula-pop` `.tree-table__head`
// (`<th>`) İÇİNDE render edilir; o sınıfın `text-transform:uppercase` +
// `letter-spacing:0.4px`i (tree-table.css) MİRAS kalıyordu — baloncuk BÜYÜK
// HARF basıyordu (mockup Q:176-180 karışık harf ister). Bu test o iki
// mirasın AÇIKÇA sıfırlandığını doğrular; sessizce silinirse (regresyon)
// KIRMIZI verir.
// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./qurr-screen.css", import.meta.url)), "utf8");

function ruleBody(className: string): string {
  const pattern = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`);
  const match = pattern.exec(css);
  expect(match, `.${className} kuralı stylesheet'te bulunamadı`).not.toBeNull();
  return match![1];
}

describe("qurr-screen.css — formül baloncuğunun tree-table__head mirasından yalıtımı", () => {
  it(".qurr-formula-pop text-transform:none ile büyük harf mirasını keser", () => {
    expect(ruleBody("qurr-formula-pop")).toMatch(/text-transform:\s*none\s*;/);
  });

  it(".qurr-formula-pop letter-spacing:normal ile P harf aralığı mirasını keser", () => {
    expect(ruleBody("qurr-formula-pop")).toMatch(/letter-spacing:\s*normal\s*;/);
  });

  // Zaten var olan iki sıfırlama (color/font-weight) da REGRESYONA karşı
  // aynı testte tutulur — dördü BİRLİKTE `.tree-table__head`in devraldığı
  // TÜM metin özelliklerini karşılar.
  it(".qurr-formula-pop color ve font-weight'ı da sıfırlar (önceden zaten vardı)", () => {
    const body = ruleBody("qurr-formula-pop");
    expect(body).toMatch(/color:\s*var\(--color-on-brand\)\s*;/);
    expect(body).toMatch(/font-weight:\s*400\s*;/);
  });
});

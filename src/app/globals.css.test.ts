// @vitest-environment node
// Not: diğer `*.css.test.ts` dosyalarıyla aynı gerekçe — dosya sistemi okuyan
// saf metin testi (regresyon koruması, gerçek cascade/render ölçmez).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf8");

// Kayıt 472 — `body` gövde kanonu `--text-body` (13px)dir; `--text-base`
// (1rem/16px) jenerik bir artıktı ve sınıfsız/gövdeden miras alan HER metni
// 16px basıyordu (tasarım sisteminde `--text-body` 228 kez kullanılıyor).
describe("globals.css — KAYIT 472: body gövde yazı boyutu kanonik token'ı kullanır", () => {
  it("`body` `--text-body` kullanır, `--text-base` KULLANMAZ", () => {
    expect(css).toMatch(/body\s*{[^}]*font-size:\s*var\(--text-body\)/);
    expect(css).not.toMatch(/body\s*{[^}]*font-size:\s*var\(--text-base\)/);
  });
});

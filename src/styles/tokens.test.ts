// @vitest-environment node
// Not: jsdom ortamında global `URL` whatwg-url polyfill'i ile değiştirilir ve
// `new URL(relative, import.meta.url)` file:// tabanını yanlış çözer
// (http://localhost:3000/... üretir). Bu saf metin testi dosya sistemi
// okuduğu için node ortamında çalıştırılır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const tokensCss = readFileSync(
  fileURLToPath(new URL("./tokens.css", import.meta.url)),
  "utf8",
);

describe("tokens.css", () => {
  it("çekirdek renk token'larını tanımlar (açık tema Slate + Blue)", () => {
    for (const token of [
      "--color-bg",
      "--color-surface",
      "--color-text",
      "--color-text-muted",
      "--color-border",
      "--color-primary",
      "--color-success",
      "--color-warning",
      "--color-danger",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("tipografi, boşluk ve yarıçap token'larını tanımlar", () => {
    for (const token of [
      "--font-sans",
      "--font-mono",
      "--text-base",
      "--text-lg",
      "--space-4",
      "--radius-md",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("koyu tema varsayılanı yoktur — açık tema kanon", () => {
    // Açık tema kanon (README); koyu tema bu fazda YOK.
    expect(tokensCss).not.toContain("prefers-color-scheme: dark");
  });
});

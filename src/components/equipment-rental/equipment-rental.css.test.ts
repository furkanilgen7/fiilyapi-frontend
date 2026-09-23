// @vitest-environment node
// Not: `contracts.css.test.ts` ile aynı gerekçe — dosya sistemi okuyan saf
// metin testi. Bu dosya YALNIZCA stylesheet METNİNDE ilgili kuralın var
// olduğunu doğrular; cascade'i ya da tarayıcıdaki görünümü DOĞRULAMAZ.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./equipment-rental.css", import.meta.url)),
  "utf8",
);

/**
 * KAYIT 101 (2026-09-23): `.select-wrap` (select.css) `width: 100%` taşır —
 * `.makine-kira__filters` (`display:flex; flex-wrap:wrap`) içinde her süzgeç
 * kendi satırını zorluyordu; mockup'ın tek satırda yan yana dizdiği beş
 * süzgeç alt alta diziliyordu.
 */
describe("equipment-rental.css — .makine-kira__filters süzgeçleri tek satırda", () => {
  it(".select-wrap çocukları flex ile daralır, width:auto olur", () => {
    expect(css).toMatch(
      /\.makine-kira__filters\s*>\s*\.select-wrap\s*\{[^}]*flex:\s*0\s+1\s+auto[^}]*\}/,
    );
    expect(css).toMatch(
      /\.makine-kira__filters\s*>\s*\.select-wrap\s*\{[^}]*width:\s*auto[^}]*\}/,
    );
  });
});

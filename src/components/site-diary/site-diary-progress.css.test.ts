// @vitest-environment node
// KAPSAM UYARISI (document-form.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i ya da
// tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama Playwright'ın işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-diary-progress.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(withoutComments);
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
}

describe("site-diary-progress.css — miktar tablosu kaydırma kabı", () => {
  it("kaydırma kabı konumlanmış içeren bloktur: ekran okuyucu etiketi (absolute) kabın dışına taşıp sayfayı yatay kaydırmaz", () => {
    // Ölçüm (PLN-F2.5, 1024 px): `.diary-lines__sr` `position:absolute`; kap
    // konumlanmamışken içeren blok kabın DIŞINDA kalıyor, `overflow-x:auto`
    // onu kırpmıyor → belge 1065 px (41 px yatay taşma).
    expect(ruleBody(".diary-lines__sr")).toMatch(/position:\s*absolute/);
    const scroller = ruleBody(".diary-lines__scroll");
    expect(scroller).toMatch(/overflow-x:\s*auto/);
    expect(scroller).toMatch(/position:\s*relative/);
  });
});

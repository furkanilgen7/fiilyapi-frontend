// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * PLN-F3.4-düzeltme (F3.6b lider denetimi) · `daily-report.css`teki miktar
 * tablosu başlık taşma DÜZELTMESİNİN kaynak kanıtı.
 *
 * jsdom `<link>`/import edilen CSS dosyalarını UYGULAMAZ — RTL testinde
 * `getComputedStyle` boş dize döner (ölçüldü), bu yüzden gerçek görsel etki
 * yalnız Playwright'ta doğrulanabilir. Bu test KAYNAK METNİ okuyup override
 * kuralının VAR olduğunu ve `white-space: nowrap`a GERİ DÖNMEDİĞİNİ garanti
 * eder — mutasyon: kural silinirse (ya da `nowrap`a çevrilirse) KIRMIZI.
 */
const CSS_PATH = fileURLToPath(new URL("./daily-report.css", import.meta.url));

describe("daily-report.css — GİR:234 miktar tablosu başlık taşma düzeltmesi", () => {
  it("`.ev-daily-qty__table th.tree-table__head` kuralı VAR ve `white-space: normal` taşır", () => {
    const css = readFileSync(CSS_PATH, "utf8");
    const match = /\.ev-daily-qty__table\s+th\.tree-table__head\s*\{([^}]*)\}/.exec(css);
    expect(match, "override kuralı kaynakta bulunamadı").not.toBeNull();
    const body = match?.[1] ?? "";
    expect(body).toMatch(/white-space:\s*normal/);
    expect(body).not.toMatch(/white-space:\s*nowrap/);
  });
});

// @vitest-environment node
// DET-1.2 · Bölüm Detay › Günlük Kayıt satırı artık bağlantıdır.
// KAPSAM UYARISI: yalnız stylesheet METNİNİ doğrular; cascade/görünüm
// Playwright'ın işidir (bolum-detay-gunluk-kayit* kareleri).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./section-detail.css", import.meta.url)), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(withoutComments);
  expect(match, selector).not.toBeNull();
  return match?.[1] ?? "";
}

describe("section-detail.css — tıklanabilir günlük satırı (mockup .lr / .lr-hover / .lr-focus)", () => {
  it("hover zemini ikincil yüzeydir (#f8fafc) ve ok maviye döner", () => {
    expect(ruleBody(".section-diary__entry-link:hover")).toMatch(
      /background:\s*var\(--color-surface-2\)/,
    );
    expect(ruleBody(".section-diary__entry-link:hover .section-diary__entry-arrow")).toMatch(
      /color:\s*var\(--color-primary\)/,
    );
  });

  it("odak halkası İÇE çizilir (kart overflow:hidden) — dış halka token'ı DEĞİL", () => {
    const body = ruleBody(".section-diary__entry-link:focus-visible");
    expect(body).toMatch(/box-shadow:\s*var\(--focus-ring-inset\)/);
    expect(body).toMatch(/outline:\s*none/);
  });

  it("S1 — taslak AMBER'i artık TEK kaynaktan (site-diary.css, DET-1.3 b): bu listede ayrı ezme kuralı YOK", () => {
    // Amber rengin kendisi `site-diary/site-diary.css.test.ts`te bekçilidir.
    expect(withoutComments).not.toMatch(/\.section-diary__entry-link\s+\.diary-recent__badge--draft\s*\{/);
  });

  it("dokunma hedefi en az 44 px (İ:527 tablet notu)", () => {
    expect(ruleBody(".section-diary__entry-link")).toMatch(/min-height:\s*44px/);
  });
});

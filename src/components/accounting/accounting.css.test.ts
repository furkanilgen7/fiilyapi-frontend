// @vitest-environment node
// `invoices.css.test.ts` ile AYNI gerekçe: dosya sistemi okuyan saf metin
// testi. Stylesheet METNİNDE ilgili kuralın var olduğunu doğrular; cascade'i
// ya da tarayıcıdaki görünümü DOĞRULAMAZ (görsel doğrulama T6'nın işi). Amaç,
// E8'e bağlı ölçü/renk kararlarının sessizce silinmesine karşı regresyon
// korumasıdır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./accounting.css", import.meta.url)), "utf8");

describe("accounting.css — E8'e bağlı kurallar", () => {
  it("dönem seçici + KPI şeridi TEK ızgaradır: `auto 1fr 1fr 1fr` (E8:72)", () => {
    expect(css).toMatch(/\.mu-strip\s*{[^}]*grid-template-columns:\s*auto 1fr 1fr 1fr/);
  });

  it("KPI değeri 20px kalın MONO'dur (E8:80)", () => {
    expect(css).toMatch(/\.mu-kpi__value\s*{[^}]*var\(--text-kpi-value\)/);
    expect(css).toMatch(/\.mu-kpi__value\s*{[^}]*var\(--font-mono\)/);
  });

  it("Toplam Borç KIRMIZI, Toplam Alacak YEŞİL (E8:80 · E8:84)", () => {
    expect(css).toMatch(/\.mu-kpi__value--danger\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-kpi__value--success\s*{[^}]*var\(--color-success\)/);
  });

  it("defter hücreleri MONO; Borç kırmızı, Alacak yeşil, Bakiye NÖTR koyu (E8:115-116)", () => {
    expect(css).toMatch(/\.mu-table \.is-mono\s*{[^}]*var\(--font-mono\)/);
    expect(css).toMatch(/\.mu-amount--debit\s*{[^}]*var\(--color-danger\)/);
    expect(css).toMatch(/\.mu-amount--credit\s*{[^}]*var\(--color-success\)/);
    expect(css).toMatch(/\.mu-amount--balance\s*{[^}]*color:\s*var\(--color-text\)/);
  });

  it("boş taraf `—` SOLGUNdur, vurgulu değil (E8:114/123)", () => {
    expect(css).toMatch(/\.mu-table__empty-cell\s*{[^}]*var\(--color-text-subtle\)/);
  });

  it("tablo kartı 14px köşe + kart gölgesidir (E8:93)", () => {
    expect(css).toMatch(/\.mu-panel\s*{[^}]*border-radius:\s*var\(--radius-14\)/);
    expect(css).toMatch(/\.mu-panel\s*{[^}]*box-shadow:\s*var\(--shadow-card\)/);
  });

  it("geniş tablolar KENDİ kabında yatay kayar — sayfa gövdesi taşmaz", () => {
    expect(css).toMatch(/\.mu-table-scroll\s*{[^}]*overflow-x:\s*auto/);
  });

  it("devir bakiyesi bandı GÖRÜNÜR bir şerittir", () => {
    expect(css).toMatch(/\.mu-carried\s*{[^}]*background:\s*var\(--color-surface-2\)/);
    expect(css).toMatch(/\.mu-carried__value\s*{[^}]*var\(--font-mono\)/);
  });

  it("🔴 BEKÇİ: çıplak hex renk YOKTUR — palet yalnız token'dan gelir", () => {
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
  });
});

// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
//
// KAPSAM UYARISI (kod inceleme bulgusu düzeltmesi, Task 12 takibi): bu dosya
// SADECE stylesheet metninde ilgili :focus-visible kuralının VAR OLDUĞUNU
// doğrular (regex ile string eşleşmesi). Şunları DOĞRULAMAZ:
//   - ilgili elemanın gerçekten odaklanabilir olduğunu (tabIndex/semantik etiket)
//   - elemanın Tab sırasında yer aldığını
//   - bu kuralın cascade'de daha sonra gelen başka bir kuralla (ör. outline: none)
//     ezilmediğini
// Bu, kasıtlı bir CSS-yazım regresyon korumasıdır — kural stylesheet'ten yanlışlıkla
// silinirse testi kırar. Gerçek klavye davranışı (odaklanabilirlik, Tab sırası) için
// bkz. eşlik eden ProjectDetailTabs.test.tsx ve SiteCard.test.tsx içindeki
// "(davranışsal)" bloklar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./project-detail.css", import.meta.url)), "utf8");

describe("project-detail.css — focus-visible kural metni var mı (regresyon koruması)", () => {
  it("proje sekmesi marka zemininde belirgin bir on-brand dış hat tanımlar", () => {
    // Jenerik --focus-ring (mavi, düşük opaklık) marka degradesi üstünde
    // görünmez kalır — bu yüzden burada --color-on-brand tabanlı outline gerekir.
    expect(css).toMatch(/\.project-hero__tab:focus-visible\s*{[^}]*outline:\s*2px solid var\(--color-on-brand\)/);
  });

  it("şantiye kartı çipi :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.site-card__chip:focus-visible\s*{[^}]*--focus-ring/);
  });
});

describe("project-detail.css — '+ Şantiye Ekle' <a> olarak da buton gibi görünür (T11)", () => {
  // Buton → bağlantı dönüşümü (spec §2.3): sınıf korunur ama tarayıcının
  // varsayılan <a> davranışı (altı çizili, satır içi kutu) stili kaydırır.
  it("add-btn alti cizili DEGILDIR", () => {
    expect(css).toMatch(/\.project-detail__add-btn\s*{[^}]*text-decoration:\s*none/);
  });

  it("add-btn inline-block kutu uretir (dolgu ve satir yuksekligi butonla ayni kalsin)", () => {
    expect(css).toMatch(/\.project-detail__add-btn\s*{[^}]*display:\s*inline-block/);
  });
});

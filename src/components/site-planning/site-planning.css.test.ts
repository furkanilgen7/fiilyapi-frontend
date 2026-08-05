// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi.
//
// KAPSAM UYARISI (site-detail.css.test.ts ile aynı): bu dosya YALNIZCA
// stylesheet METNİNDE ilgili kuralın var olduğunu doğrular. Kuralın cascade'de
// ezilmediğini, elemanın gerçekten odaklanabilir olduğunu ya da tarayıcıda
// nasıl göründüğünü DOĞRULAMAZ. Amaç, mockup'a bağlı kuralların yanlışlıkla
// silinmesine karşı regresyon korumasıdır (görsel doğrulama T4'ün işi).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./site-planning.css", import.meta.url)), "utf8");

describe("site-planning.css — mockup'a bağlı kurallar (regresyon koruması)", () => {
  it("ızgara sütun iskeleti 140px + 7 eşit gündür (P109)", () => {
    expect(css).toMatch(
      /\.plan-grid__row\s*{[^}]*grid-template-columns:\s*var\(--width-plan-lead-col\) repeat\(7, 1fr\)/,
    );
  });

  it("hafta sonu gün başlığı ve hücresi AYRI tonlar kullanır (P116-117 / P132-133)", () => {
    expect(css).toMatch(/\.plan-grid__day--weekend\s*{[^}]*var\(--color-amber-tint\)/);
    expect(css).toMatch(/\.plan-grid__cell--weekend\s*{[^}]*var\(--color-amber-tint-cell\)/);
  });

  it("altı renk etiketinin HEPSİ tanımlıdır (P127/129/131/137/147/173)", () => {
    for (const tag of ["blue", "green", "yellow", "purple", "gray", "red"]) {
      expect(css, tag).toMatch(new RegExp(`\\.plan-cell__chip--${tag}\\s*{`));
    }
  });

  it("dört hedef durumunun HEPSİ tanımlıdır (P209/214/219/224)", () => {
    for (const status of ["completed", "in_progress", "waiting", "service_pending"]) {
      expect(css, status).toMatch(new RegExp(`\\.plan-goals__status--${status}\\s*{`));
    }
  });

  it("grup başlığı ikinci hücresi kalan 7 sütunu kaplar (P123)", () => {
    expect(css).toMatch(/\.plan-grid__group-meta\s*{[^}]*grid-column:\s*2 \/ -1/);
  });

  it("alt iki kart eşit iki sütundur (P184)", () => {
    expect(css).toMatch(/\.plan__bottom\s*{[^}]*grid-template-columns:\s*1fr 1fr/);
  });

  it("hafta oku ve görünüm kipi butonları tasarlanmış odak halkası taşır", () => {
    expect(css).toMatch(/\.btn\.plan-week-nav__arrow:focus-visible[^{]*{[^}]*--focus-ring/);
  });

  it("popover ızgaranın KENDİ kart dilinden türer (kenarlık + gölge token'ları)", () => {
    // F-PL T3: yabancı duran bir yüzey final review bulgusudur — popover
    // kartın (P101) kenarlığını ve gölge ailesini kullanır, kendi rengini icat
    // etmez.
    expect(css).toMatch(/\.plan-pop\s*{[^}]*border:\s*1px solid var\(--color-border\)/);
    expect(css).toMatch(/\.plan-pop\s*{[^}]*box-shadow:\s*var\(--shadow-/);
  });

  it("renk seçici ızgaranın çip sınıflarını YENİDEN TANIMLAMAZ", () => {
    // Seçenekler `.plan-cell__chip--*` ile boyanır; seçici yalnız etkileşim
    // ekler (kenarlık currentcolor, imleç, odak halkası).
    expect(css).toMatch(/\.plan-cell__chip\.plan-pop__tag\s*{/);
    expect(css).toMatch(/\.plan-cell__chip\.plan-pop__tag--active\s*{[^}]*currentcolor/);
  });

  it("BOŞ hücrenin tıklanabilir alanı hücreyi kaplar (T4 tarayıcı bulgusu)", () => {
    // `.plan-pop-anchor` sığdır (inline-flex); hücrede öyle kalırsa içeriği
    // olmayan hücrenin butonu SIFIR genişlikte olur ve boş güne plan
    // girilemez. Hücre çapası bu yüzden blok olmalıdır.
    expect(css).toMatch(/\.plan-pop-anchor--cell\s*{[^}]*display:\s*block/);
  });

  it("çıplak hex renk KULLANMAZ (tüm renkler tokens.css'ten)", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

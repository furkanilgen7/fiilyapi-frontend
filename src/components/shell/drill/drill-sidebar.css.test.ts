// @vitest-environment node
// Not: tokens.test.ts ile aynı gerekçe — dosya sistemi okuyan saf metin testi,
// jsdom'un URL polyfill'i file:// çözümünü bozduğu için node ortamında çalışır.
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
// bkz. eşlik eden DrillSidebar.test.tsx içindeki "klavye odak sırası (davranışsal)" bloğu.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./drill-sidebar.css", import.meta.url)), "utf8");

describe("drill-sidebar.css — focus-visible kural metni var mı (regresyon koruması)", () => {
  it("geri linki :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.drill-sidebar__back:focus-visible\s*{[^}]*--focus-ring/);
  });

  it("nav öğesi :focus-visible ile tasarlanmış odak halkası tanımlar (--focus-ring)", () => {
    expect(css).toMatch(/\.drill-nav-item:focus-visible\s*{[^}]*--focus-ring/);
  });
});

// KOD INCELEME BULGUSU (kritik): içerik ofseti (.project-detail-content ve
// .site-detail-content) iki stylesheet'te birebir aynı şekilde duruyordu; iç
// içe geçen layout'larda margin/padding iki kez uygulanıyordu. Ofset artık
// TEK bir kuralda (.drill-content) yaşar.
describe("drill içerik ofseti tek yerde tanımlıdır (regresyon koruması)", () => {
  const projectCss = readFileSync(
    fileURLToPath(new URL("../../project-detail/project-detail.css", import.meta.url)),
    "utf8",
  );
  const siteCss = readFileSync(
    fileURLToPath(new URL("../../site-detail/site-detail.css", import.meta.url)),
    "utf8",
  );

  it(".drill-content ofseti drill-sidebar.css içinde tanımlıdır", () => {
    expect(css).toMatch(/\.drill-content\s*{[^}]*--drill-sidebar-width/);
  });

  it("proje ve şantiye stylesheet'leri kendi içerik ofsetini TEKRARLAMAZ", () => {
    expect(projectCss).not.toMatch(/\.project-detail-content\s*{/);
    expect(siteCss).not.toMatch(/\.site-detail-content\s*{/);
  });
});

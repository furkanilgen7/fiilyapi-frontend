// @vitest-environment node
// F-SA T4 · YAPISAL kanıt: "EN İYİ FİYAT" rozeti istemcide YENİDEN
// HESAPLANMAZ. Davranış testi ("sunucunun damgaladığı kart rozetlenir") bir
// gün birinin `unit_price` üzerinden yedek bir sıralama eklemesini
// ENGELLEMEZ; bu yüzden kaynak METNİ taranır (`purchase-request-approval.
// source.test.ts` ve `purchasing.css.test.ts` ile aynı tür regresyon
// korumasıdır).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIR = dirname(fileURLToPath(import.meta.url));

function read(name: string): string {
  return readFileSync(join(DIR, name), "utf8");
}

describe("teklif rozeti — istemcide fiyat karşılaştırması YOK", () => {
  // Yalnız ERİŞİM aranır (`.unit_price`): açıklama satırları alanın adını
  // gerekçe olarak yazabilir, kod ona DOKUNAMAZ.
  it("saf çekirdek `unit_price` alanını hiç OKUMAZ", () => {
    expect(read("quote-comparison.ts")).not.toMatch(/\.unit_price\b/);
  });

  it("rozetin kaynağı yalnızca sunucunun `is_best_price` damgasıdır", () => {
    expect(read("quote-comparison.ts")).toMatch(/is_best_price/);
  });

  // Kart da rozeti kendi türetmez: `is_best_price`i OKUR, hesaplamaz.
  it("kart bileşeni birim fiyatları birbiriyle KIYASLAMAZ", () => {
    const card = read("QuoteComparisonCard.tsx");
    expect(card).toMatch(/quote\.is_best_price/);
    expect(card).not.toMatch(/Math\.(min|max)/);
    expect(card).not.toMatch(/\.sort\(/);
  });
});

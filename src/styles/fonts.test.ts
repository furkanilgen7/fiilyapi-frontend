// @vitest-environment node
// Not: jsdom ortamında global `URL` whatwg-url polyfill'i ile değiştirilir ve
// `new URL(relative, import.meta.url)` file:// tabanını yanlış çözer
// (http://localhost:3000/... üretir). Bu saf metin testi dosya sistemi
// okuduğu için node ortamında çalıştırılır.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * NÜKS KORUYUCUSU (F-TB2).
 *
 * `fonts.css` elle YAZILMADI — Google Fonts'tan `next/font` ile yüklemenin ürettiği CSS'in birebir
 * kopyasıdır (bkz. o dosyanın başlığı ve `public/fonts/README.md`). Elle
 * bakılan kopyalanmış CSS ÇÜRÜR: biri "27 kural fazla, sadeleştireyim" ya da
 * "bu `unicode-range` uzunmuş" derse hiçbir derleyici, linter ya da tip kapısı
 * bunu yakalamaz. Sonuç sessizdir ve kötüdür: aynı aile+ağırlık+stil'i paylaşan
 * kurallar ayırt edilemez hâle gelir, CSS eşleştirmesinde sonuncusu öncekileri
 * ölü bırakır ve Türkçe `ğ ş İ` harfleri yedek yazı tipine düşer — üstelik
 * geliştiricinin makinesinde sistem yazı tipi devreye girdiği için fark
 * edilmeyebilir.
 *
 * Bu dosya o çürümeyi kapıya çevirir.
 */

const fontsCss = readFileSync(
  fileURLToPath(new URL("./fonts.css", import.meta.url)),
  "utf8",
);

const publicFontsDir = fileURLToPath(
  new URL("../../public/fonts/", import.meta.url),
);

/** Yorumlar `@font-face`/`unicode-range` kelimelerini geçtiği için sayımdan düşülür. */
const cssWithoutComments = fontsCss.replace(/\/\*[\s\S]*?\*\//g, "");

/** Üretilen çıktının kural sayısı: Inter 7 + Inter yedeği 1 + JBM 3×6 + JBM yedeği 1. */
const EXPECTED_FONT_FACE_COUNT = 27;

/** İki yedek kuralı alt küme taşımaz; kalan 25'inin HEPSİ `unicode-range`lidir. */
const EXPECTED_UNICODE_RANGE_COUNT = 25;

/** Türkçe `ğ ş İ` harflerinin bulunduğu latin-ext aralığının başlangıcı. */
const LATIN_EXT_RANGE_START = "u+0100-02ba";

/** `public/fonts/` altındaki `.woff2` dosya sayısı (7 Inter + 6 JetBrains Mono). */
const EXPECTED_WOFF2_COUNT = 13;

const fontFaceBlocks = cssWithoutComments.match(/@font-face\s*\{[^}]*\}/g) ?? [];

describe("fonts.css — self-host edilmiş yazı tipi tanımları", () => {
  // Kural DÜŞERSE bir alt küme tamamen kaybolur: o aralıktaki karakterler
  // (ör. bir ağırlıkta Türkçe harfler) yedeğe düşer. Sayı sabittir.
  it("tam 27 @font-face kuralı taşır — kural düşerse bir alt küme sessizce kaybolur", () => {
    expect(fontFaceBlocks).toHaveLength(EXPECTED_FONT_FACE_COUNT);
  });

  // `unicode-range` bu göçün can damarıdır: aynı aile+ağırlık+stil'in 25
  // kuralını birbirinden ayıran TEK şey odur. Biri silinirse kurallar ayırt
  // edilemez olur ve son kural öncekileri ölü bırakır.
  it("iki yedek dışındaki 25 kuralın hepsinde unicode-range vardır", () => {
    const withRange = fontFaceBlocks.filter((block) =>
      block.includes("unicode-range:"),
    );
    expect(withRange).toHaveLength(EXPECTED_UNICODE_RANGE_COUNT);

    const withoutRange = fontFaceBlocks.filter(
      (block) => !block.includes("unicode-range:"),
    );
    expect(withoutRange).toHaveLength(
      EXPECTED_FONT_FACE_COUNT - EXPECTED_UNICODE_RANGE_COUNT,
    );
    // Alt kümesiz olan İKİ kural yalnızca yedeklerdir; gerçek bir aile
    // buraya düşerse alt küme kaybı olmuş demektir.
    for (const block of withoutRange) {
      expect(block).toContain("Fallback");
    }
  });

  // Yedek ölçüleri Next'in gerçek yazı tipini ÖLÇEREK ürettiği değerlerdir;
  // yazı tipi yüklenene kadar Arial'ı aynı satır yüksekliğine oturtur. Biri
  // değişirse ilk boyamada düzen kayar (CLS) ve görsel baseline'lar oynar.
  it("Inter yedeğinin dört ölçüsü üretilen değerleriyle birebir aynıdır", () => {
    const interFallback = fontFaceBlocks.find((block) =>
      block.includes("Inter Fallback"),
    );
    expect(interFallback).toBeDefined();
    expect(interFallback).toContain('src: local("Arial")');
    expect(interFallback).toContain("ascent-override: 90.44%");
    expect(interFallback).toContain("descent-override: 22.52%");
    expect(interFallback).toContain("line-gap-override: 0.00%");
    expect(interFallback).toContain("size-adjust: 107.12%");
  });

  it("JetBrains Mono yedeğinin dört ölçüsü üretilen değerleriyle birebir aynıdır", () => {
    const monoFallback = fontFaceBlocks.find((block) =>
      block.includes("JetBrains Mono Fallback"),
    );
    expect(monoFallback).toBeDefined();
    expect(monoFallback).toContain('src: local("Arial")');
    expect(monoFallback).toContain("ascent-override: 75.79%");
    expect(monoFallback).toContain("descent-override: 22.29%");
    expect(monoFallback).toContain("line-gap-override: 0.00%");
    expect(monoFallback).toContain("size-adjust: 134.59%");
  });

  // Uygulamanın dili Türkçedir. `ğ ş İ` latin-ext aralığındadır; o aralığı
  // taşıyan kural HER İKİ ailede de bulunmazsa arayüzün Türkçe harfleri
  // sistem yazı tipine düşer ve tipografi bozulur.
  it("Türkçe harflerin latin-ext aralığı HEM Inter HEM JetBrains Mono için tanımlıdır", () => {
    const latinExtBlocks = fontFaceBlocks.filter((block) =>
      block.includes(LATIN_EXT_RANGE_START),
    );

    const interLatinExt = latinExtBlocks.filter((block) =>
      /font-family:\s*Inter\s*;/.test(block),
    );
    expect(interLatinExt.length).toBeGreaterThan(0);

    const monoLatinExt = latinExtBlocks.filter((block) =>
      /font-family:\s*JetBrains Mono\s*;/.test(block),
    );
    // Üç ağırlığın (400/600/700) her biri kendi latin-ext kuralını taşır.
    expect(monoLatinExt).toHaveLength(3);
  });

  // Yollar `/fonts/` altına gösterir; dosyalar `public/fonts/` altında durur.
  // Bir dosya taşınır ya da silinirse tarayıcı 404 alır ve yazı tipi sessizce
  // yedeğe düşer — build de test de bunu başka türlü görmez.
  it("her src yolu /fonts/ altındadır ve dosya public/fonts/ içinde gerçekten vardır", () => {
    const urls = [...cssWithoutComments.matchAll(/src:\s*url\(([^)]+)\)/g)].map(
      (match) => match[1],
    );
    expect(urls.length).toBeGreaterThan(0);

    const referenced = new Set<string>();
    for (const url of urls) {
      expect(url.startsWith("/fonts/")).toBe(true);
      const fileName = url.slice("/fonts/".length);
      expect(existsSync(`${publicFontsDir}${fileName}`)).toBe(true);
      referenced.add(fileName);
    }

    // 13 dosyanın HEPSİ referanslanır: kullanılmayan bir dosya kalırsa ya da
    // bir alt küme kuralı düşerse bu sayı sapar.
    expect(referenced.size).toBe(EXPECTED_WOFF2_COUNT);
  });

  // Değişkenler `<html>` sınıfından `:root`a taşındı; `tokens.css`teki
  // `--font-sans`/`--font-mono` bunları sarar. Kaybolurlarsa her iki token da
  // çözümsüz kalır ve tüm uygulama sistem yazı tipine düşer.
  it("--font-inter ve --font-jetbrains-mono :root'ta üretilen değerleriyle tanımlıdır", () => {
    expect(cssWithoutComments).toContain(
      '--font-inter: "Inter", "Inter Fallback";',
    );
    expect(cssWithoutComments).toContain(
      '--font-jetbrains-mono: "JetBrains Mono", "JetBrains Mono Fallback";',
    );
  });
});

const srcDir = fileURLToPath(new URL("../", import.meta.url));

/** İncelenecek uzantılar: import/require/`@import` bu üçünde görünebilir. */
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".css"];

/** `from "next/font...`, `require("next/font...`, `@import ... next/font` — hepsi bir Google Fonts eklentisi importudur. */
const NEXT_FONT_IMPORT_PATTERN =
  /(from\s+["']next\/font|require\(\s*["']next\/font|@import\s+[^;]*next\/font)/;

/** Bu dosyanın kendisi: bekçi deseni kendi kaynağını içerdiği için taramadan hariç tutulur. */
const selfPath = fileURLToPath(new URL("./fonts.test.ts", import.meta.url));

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    if (
      SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
      fullPath !== selfPath
    ) {
      return [fullPath];
    }
    return [];
  });
}

describe("next/font nüks bekçisi (F-TB2 T3)", () => {
  // ASIL KORUMA burasıdır — grep tabanlı kabul kriteri yalnız yorum metnini
  // temizler, gerçek geri dönüşü BU test yakalar. `next/font/google` yazı
  // tipini DERLEME ANINDA `fonts.gstatic.com`tan indirir; CI runner'ı oraya
  // ulaşamazsa `pnpm build` patlar, Playwright sunucuyu hiç başlatamaz ve
  // `visual` işi "kare bozuldu" gibi görünen bir kırmızıyla düşer (F-MK'de
  // bir saat kaybettirdi, CI run 31791721117). Bu import geri gelirse o
  // kumar geri gelir — bu test onu commit anında yakalamak içindir.
  it("src/ altında hiçbir dosya next/font'tan import/require/@import etmez", () => {
    const files = listSourceFiles(srcDir);
    const offenders = files
      .map((filePath) => ({
        filePath,
        content: readFileSync(filePath, "utf8"),
      }))
      .filter(({ content }) => NEXT_FONT_IMPORT_PATTERN.test(content));

    expect(offenders.map((o) => o.filePath)).toEqual([]);
  });
});

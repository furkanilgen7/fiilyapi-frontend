import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * EXPORT-XLSX · `export-test-stub.ts` ÜRÜN GRAFİĞİNE SIZMAZ.
 *
 * Stub `src/` altında yaşar (testler `@/` takma adıyla onu böyle görür) ama
 * `vitest` import eder. Ürün kodundan biri onu import ederse `vitest` ÜRÜN
 * PAKETİNE girer ve bunu hiçbir ekran testi göremez — yalnız paket boyutu
 * büyür. Bu yüzden kural DAVRANIŞLA değil YAPIYLA korunur.
 *
 * Aynı bekçi ikinci bir soruyu da kapatır: `src/` altında `*.test.*` olmayan
 * BAŞKA bir dosya `vitest` import etmeye başlarsa bu, stub'ın açtığı emsalin
 * yayıldığı anlamına gelir.
 */

const SRC = join(process.cwd(), "src");
const STUB = "export-test-stub";
const TEST_DOSYASI = /\.(test|spec)\.[cm]?[jt]sx?$/;

function* kaynakDosyalari(dizin: string): Generator<string> {
  for (const oge of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, oge.name);
    if (oge.isDirectory()) yield* kaynakDosyalari(yol);
    else if (/\.[cm]?[jt]sx?$/.test(oge.name)) yield yol;
  }
}

const URUN_DOSYALARI = [...kaynakDosyalari(SRC)].filter(
  (yol) => !TEST_DOSYASI.test(yol) && !yol.endsWith(`${STUB}.ts`),
);

describe("test stub'i urun grafigine sizmaz", () => {
  it("urun dosyasi sayilmaya deger kadar cok (bekci bos kume uzerinde kosmuyor)", () => {
    // Pozitif kontrol: tarama gerçekten dosya buluyor. Bu olmadan bozuk bir
    // `kaynakDosyalari` boş küme döndürüp aşağıdaki iki testi YEŞİL geçirirdi.
    expect(URUN_DOSYALARI.length).toBeGreaterThan(100);
  });

  it.each(URUN_DOSYALARI.map((y) => [y.slice(SRC.length + 1), y] as const))(
    "%s stub'i import etmez",
    (_ad, yol) => {
      expect(readFileSync(yol, "utf8")).not.toContain(STUB);
    },
  );

  it("src/ altinda `vitest` import eden tek test-DISI dosya stub'in KENDISIDIR", () => {
    const sizanlar = URUN_DOSYALARI.filter((yol) =>
      /from ["']vitest["']/.test(readFileSync(yol, "utf8")),
    ).map((yol) => yol.slice(SRC.length + 1));
    expect(sizanlar).toEqual([]);
  });
});

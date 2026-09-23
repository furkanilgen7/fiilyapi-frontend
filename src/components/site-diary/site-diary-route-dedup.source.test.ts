// @vitest-environment node
// M5_3 #305/#306 · YAPISAL kanıt: gün-lük kayıt/planlama/özet/hakediş
// bağlantıları YALNIZ `routes.ts`in `diary`/`diarySummary`/`diaryPlanning`/
// `progressPayments` üreticilerinden gelir.
//
// Davranış testi ("basılan href routes.ts ile AYNI") bunu YAPISAL olarak
// kanıtlayamaz: elle `${base}/gunluk-kayit` yazmak `routes.ts`in ürettiğiyle
// TAM AYNI dizeyi üretir (ikisi de aynı segmentleri birleştirir), yani o test
// bozuk hâlde de geçerdi (ölçüldü — M5_3 onarımında). Bu yüzden kaynak METNİ
// taranır: `${base}` + elle yol segmenti birleştirme deseni site-diary
// dizininde hiç GEÇMEMELİDİR.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIR = dirname(fileURLToPath(import.meta.url));

/** `${base}/gunluk-kayit` · `${base}/hakedisler` vb. — elle yol birleştirme. */
const MANUAL_BASE_CONCAT = /\$\{base\}\/(gunluk-kayit|hakedisler)/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("site-diary rota bağlantıları — elle birleştirme YOK (#305/#306)", () => {
  const files = readdirSync(DIR).filter(
    (name) => (name.endsWith(".ts") || name.endsWith(".tsx")) && !name.includes(".test."),
  );

  it("site-diary kaynak dosyaları taranabiliyor (tarama boşa düşmesin)", () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain("SiteDiaryEntryView.tsx");
  });

  it("`${base}/gunluk-kayit...` ya da `${base}/hakedisler` deseni HİÇBİR dosyada geçmez", () => {
    const offenders = files.filter((name) => {
      const source = stripComments(readFileSync(join(DIR, name), "utf8"));
      return MANUAL_BASE_CONCAT.test(source);
    });

    expect(offenders).toEqual([]);
  });
});

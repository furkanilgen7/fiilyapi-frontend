// @vitest-environment node
// F-SA T3 · Spec K6'nın YAPISAL kanıtı: onay eşiği metni TEK KAYNAKTAN gelir.
//
// Davranış testi ("iki yüzey aynı dizeyi taşır") eşiğin iki ayrı yere
// hardcode edilmiş OLMADIĞINI kanıtlayamaz — ikisi de "₺500K" yazsaydı o test
// de geçerdi. Bu yüzden kaynak METNİ taranır: eşik sayısı ve kısa gösterimi
// `purchase-request-approval.ts` DIŞINDA hiçbir satınalma dosyasında geçmez.
// (`purchasing.css.test.ts`in çıplak-hex taramasıyla aynı tür regresyon
// korumasıdır.)
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_OF_TRUTH = "purchase-request-approval.ts";

/** Eşiğin ham ve kısa gösterimleri — ikisi de tek kaynağa hapsedilir. */
const THRESHOLD_LITERALS = [/\b500000\b/, /500\s*K/];

/**
 * YORUMLAR taranmaz: kuralın kendisini ANLATAN satırlar ("buraya 500K yazmak
 * bulgudur") kod değildir ve ekrana hiçbir şey basmaz. Taranan şey çalışan
 * koddur.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("onay eşiği tek kaynak (spec K6)", () => {
  const files = readdirSync(DIR).filter(
    (name) =>
      (name.endsWith(".ts") || name.endsWith(".tsx")) &&
      !name.includes(".test."),
  );

  it("satınalma kaynak dosyaları taranabiliyor (tarama boşa düşmesin)", () => {
    expect(files).toContain(SOURCE_OF_TRUTH);
    expect(files.length).toBeGreaterThan(5);
  });

  it("eşik değeri YALNIZ purchase-request-approval.ts içinde geçer", () => {
    const offenders = files
      .filter((name) => name !== SOURCE_OF_TRUTH)
      .filter((name) => {
        const source = stripComments(readFileSync(join(DIR, name), "utf8"));
        return THRESHOLD_LITERALS.some((pattern) => pattern.test(source));
      });

    expect(offenders).toEqual([]);
  });

  /*
   * 🔴 BU İDDİA KALDIRILDI: "tek kaynak dosyası eşiği GERÇEKTEN tanımlar"
   * (`export const PURCHASE_APPROVAL_THRESHOLD = 500000;`). Bekçi YANLIŞ tek
   * kaynağı kilitliyordu — gerçek doğruluk kaynağı sunucudur
   * (`company.approval_threshold_try`, `GET/PUT /approvals/settings`) ve bu
   * iddia eşiği sunucudan okumaya geçiren DOĞRU düzeltmenin önünde bariyerdi.
   * Yerine geçen bekçi: `purchase-request-approval.test.ts` "eşik SUNUCUDAN
   * gelir" kümesi + `PurchaseRequestApprovalBox.test.tsx`.
   *
   * Aşağıdaki literal taraması KALIR ve artık TÜM dosyaları kapsar: kimse
   * eşiği yeniden koda gömmesin.
   */
  it("eşik sayısı ARTIK HİÇBİR satınalma dosyasında gömülü değil", () => {
    const offenders = files.filter((name) => {
      const source = stripComments(readFileSync(join(DIR, name), "utf8"));
      return THRESHOLD_LITERALS.some((pattern) => pattern.test(source));
    });

    expect(offenders).toEqual([]);
  });
});

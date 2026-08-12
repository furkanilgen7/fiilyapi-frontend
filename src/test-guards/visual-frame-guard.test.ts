// @vitest-environment node
//
// F-PT2 T1 · KANON BEKÇİSİ (WORKFLOW §4 "GÖRSEL SPEC KURALI" 2.+3. parça).
//
// KÖK OLAY: iki baseline turu arasında (31608574847 ↔ 31609771927)
// `puantaj-hucre-popover.png` 317px/şiddet ~218 farkla ÇİFT-MODLU çıktı
// ("FM rozet kenarlığı" var/yok). Kök neden: `timesheet-visual.spec.ts`teki
// `prepareFrame(page)` çağrısı `toHaveScreenshot`tan HEMEN önce DEĞİLDİ —
// arada bir geometri `evaluate()`si + iki `expect` vardı. Kanon
// (`e2e/visual-scroll.ts` → `prepareFrame`) kaydırmayı VE imleç konumunu
// yalnız KENDİSİNDEN SONRA hiçbir DOM etkileşimi olmadığında garanti eder —
// araya giren her `evaluate`/`expect` (hover durumunu değiştirebilir,
// layout'u yeniden ölçebilir) kareyi DETERMİNİSTİK OLMAKTAN çıkarır.
//
// Bu test `e2e/*.spec.ts` içindeki HER `toHaveScreenshot` çağrısının hemen
// öncesindeki ANLAMLI (boş/satır-yorumu olmayan) satırın `prepareFrame(page)`
// çağrısı olduğunu iddia eder — yalnız `prepareFrame` KULLANAN (yani kadraj
// hazırlığına tabi) dosyalar taranır. `text-inventory.test.ts` /
// `field-adoption.test.ts` deseninin metin-taramalı koruma testi emsali.
//
// e2e/ dizini `vitest.config.ts`te Vitest'ten HARİÇ TUTULUR (Playwright'a
// ait) — bu yüzden bekçi burada, `src/` altında yaşar ve dosyaları OKUR
// (koşturmaz).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, expect } from "vitest";

const e2eDir = fileURLToPath(new URL("../../e2e", import.meta.url));

function isVisualSpecFile(fileName: string): boolean {
  return fileName.endsWith(".spec.ts") && !fileName.includes("-snapshots");
}

/** Yalnız `prepareFrame`ı GERÇEKTEN kullanan dosyalar taranır. */
function usesPrepareFrame(content: string): boolean {
  return content.includes('from "./visual-scroll"') && content.includes("prepareFrame(page)");
}

const PREPARE_FRAME_CALL = "await prepareFrame(page);";
const SCREENSHOT_CALL_RE = /^await expect\(.+\)\.toHaveScreenshot\(/;

interface Violation {
  file: string;
  line: number;
  precedingLine: string;
}

/**
 * Her `toHaveScreenshot` çağrısı için: geriye doğru boş/satır-yorumu
 * satırları ATLAYARAK ilk ANLAMLI satırı bulur, `prepareFrame(page)` çağrısı
 * DEĞİLSE ihlal olarak kaydeder.
 */
function findViolations(file: string, content: string): Violation[] {
  const lines = content.split("\n");
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!SCREENSHOT_CALL_RE.test(lines[i].trim())) continue;

    let j = i - 1;
    while (j >= 0) {
      const trimmed = lines[j].trim();
      if (trimmed === "" || trimmed.startsWith("//")) {
        j -= 1;
        continue;
      }
      break;
    }

    const precedingLine = j >= 0 ? lines[j].trim() : "";
    if (precedingLine !== PREPARE_FRAME_CALL) {
      violations.push({ file, line: i + 1, precedingLine });
    }
  }

  return violations;
}

describe("gorsel kadraj kanonu — prepareFrame HER zaman toHaveScreenshot'tan hemen once", () => {
  const specFiles = readdirSync(e2eDir).filter(isVisualSpecFile);

  it("taranacak en az bir gorsel spec dosyasi bulunur (kapsam bos KALMAZ)", () => {
    expect(specFiles.length).toBeGreaterThan(0);
  });

  it("prepareFrame kullanan HER spec dosyasinda arada iddia/evaluate YOKTUR", () => {
    const allViolations: Violation[] = [];

    for (const fileName of specFiles) {
      const fullPath = path.join(e2eDir, fileName);
      const content = readFileSync(fullPath, "utf8");
      if (!usesPrepareFrame(content)) continue;
      allViolations.push(...findViolations(fileName, content));
    }

    const message = allViolations
      .map(
        (v) =>
          `${v.file}:${v.line} — prepareFrame'den hemen once "${v.precedingLine}" var, ` +
          `bu evaluate/expect kadrajın hover/kaydirma durumunu DEGISTIREBILIR`,
      )
      .join("\n");

    expect(allViolations, message).toEqual([]);
  });
});

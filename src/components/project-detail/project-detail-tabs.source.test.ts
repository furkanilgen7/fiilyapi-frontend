// @vitest-environment node
/**
 * 🔴 F-PRJKALEM · EŞDEĞER MUTANT BEKÇİSİ (kaynak düzeyi).
 *
 * Mutasyon turunda ölçüldü: "İş Kalemleri" sekmesinin href'i kanonik kurucu
 * yerine ELLE ve DOĞRU yazılırsa (`/sozlesmeler/isveren/${encodeURIComponent(id)}?tab=items`)
 * 265 birim testinin HİÇBİRİ kırmızı vermez — çıktı bire bir aynıdır. Yani
 * davranış testleriyle yakalanması İMKÂNSIZ bir mutanttır (eşdeğer mutant) ve
 * eşdeğer mutant = BEKÇİ EKSİKLİĞİdir.
 *
 * Bekçilenen şey davranış değil, TEK KAYNAK invariantıdır: sözleşme rotası
 * `employer-contract-tabs.ts`te YAŞAR. İkinci bir yazım, param adı ya da
 * kanonik-kısa-URL kuralı değiştiğinde sessizce ayrışırdı — `ProjectDetailTabs`
 * içindeki `projectSummaryHref`/`projectAllocationHref` notunun anlattığı
 * çürüme sınıfının tam olarak aynısı.
 *
 * Emsal: `purchase-request-approval.source.test.ts` (kaynak metnini okuyan bekçi).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./ProjectDetailTabs.tsx", import.meta.url)),
  "utf8",
);

// Yorum satırları düşürülür: bu dosyanın kendi açıklamaları rotayı ANIYOR.
const code = source
  .split("\n")
  .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
  .join("\n");

describe("ProjectDetailTabs — sözleşme rotası TEK KAYNAKTAN gelir", () => {
  it("kanonik kurucuyu import eder", () => {
    expect(source).toMatch(
      /import\s*{\s*employerContractTabHref\s*}\s*from\s*"\.\.\/contracts\/employer-contract-tabs"/,
    );
  });

  it("sözleşme rotasını KODDA elle kurmaz", () => {
    expect(
      code,
      [
        "`/sozlesmeler/isveren/...` dizesi ProjectDetailTabs.tsx KODUNDA elle yazılmış.",
        "Yapılacak: `employerContractTabHref(id, \"items\")` kullan — rota tek yerde",
        "(`contracts/employer-contract-tabs.ts`) yaşar. Elle yazım çalışır ama",
        "param adı/kanonik-kısa-URL kuralı değişince SESSİZCE ayrışır.",
      ].join("\n"),
    ).not.toMatch(/\/sozlesmeler\/isveren/);
  });
});

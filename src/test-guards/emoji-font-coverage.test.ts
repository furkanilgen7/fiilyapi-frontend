// @vitest-environment node
//
// KAYIT 123 · `src/styles/fonts.css`teki TÜM `unicode-range` kuralları
// arasında yalnız `u+1f??` (satır 66) emoji aralığıdır. U+2705 (✅) bu
// aralığın DIŞINDA kalır ve CI runner'ının (ubuntu-latest) sistem yedek
// fontuna düşer — kare turdan tura oynar (bkz.
// `settings-nav-config.ts:30-40`, aynı kusur orada zaten `\u{1F44D}`ye
// çevrilmişti). Bu bekçi kaynak dosyaları METİN olarak tarar ve `✅`/`✔️`/
// `☑️` gibi u+1f?? DIŞINDAKİ onay glifinin kod içinde (yorum satırları HARİÇ)
// canlı yüzeye basılmadığını iddia eder.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, expect } from "vitest";

const srcDir = fileURLToPath(new URL("../../src", import.meta.url));

// u+1f?? dışındaki, bu depoda daha önce yakalanan onay glifleri.
const UNCOVERED_CHECK_GLYPHS = ["✅", "✔️", "☑️"];

// 🔴 KAYIT 123 KAPSAMI: yalnız bu iki dosya bu turda ölçülüp düzeltildi
// (RolesScreen sekmesi + yedekleme bandı). `SubcontractorProgressPaymentForm
// .tsx:489`de de aynı sınıftan bir kullanım VAR ama bu kaydın alanı DEĞİL —
// ayrı bir triyaj kaydı gerektirir, bilerek genişletilmedi (bkz. çıktı `kalan`).
const IN_SCOPE_RELATIVE_PATHS = [
  path.join("components", "settings", "roles", "RolesScreen.tsx"),
  path.join("components", "settings", "backup", "BackupScreen.tsx"),
];

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry) || entry.endsWith(".test.tsx") || entry.endsWith(".test.ts")) {
      continue;
    }
    if (!IN_SCOPE_RELATIVE_PATHS.includes(path.relative(srcDir, full))) continue;
    files.push(full);
  }
  return files;
}

interface Hit {
  file: string;
  line: number;
  glyph: string;
}

function findLiveHits(files: string[]): Hit[] {
  const hits: Hit[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      // Yorum satırı (açıklama amaçlı geçen glif) muaf — yalnız CANLI
      // yüzeye basılan kullanım hedeflenir.
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
      for (const glyph of UNCOVERED_CHECK_GLYPHS) {
        if (line.includes(glyph)) {
          hits.push({ file: path.relative(srcDir, file), line: i + 1, glyph });
        }
      }
    });
  }
  return hits;
}

describe("emoji font kapsamı · u+1f?? dışı onay glifi canlı yüzeye basılmaz (kayıt 123)", () => {
  it("✅/✔️/☑️ yorum DIŞINDA hiçbir dosyada kullanılmaz", () => {
    const files = collectSourceFiles(srcDir);
    const hits = findLiveHits(files);
    const message = hits.map((h) => `${h.file}:${h.line} — "${h.glyph}"`).join("\n");
    expect(hits, message).toEqual([]);
  });
});

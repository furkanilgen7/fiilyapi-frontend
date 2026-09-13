// @vitest-environment node
//
// PAYLAŞILAN URL PARAMETRE ANAHTARI BEKÇİSİ (`?proje=` · `?blok=`).
//
// KÖK OLAY (ölçüldü): `const PROJECT_PARAM = "proje"` ON ayrı üretim dosyasında
// YERELCE yeniden tanımlıydı, `const BLOCK_PARAM = "blok"` ikisinde. Hiçbiri
// ötekini ithal etmiyordu — `command grep -rn 'import.*PROJECT_PARAM' src` sıfır
// satır veriyordu. Anahtarı birbirine bağlayan TEK şey dize eşitliğiydi; sözleşme
// yalnızca yorumla ("`BulkUnitCreateView` aynı adı okur") ifade edilmişti.
//
// NEDEN KUSUR: üretici ile tüketici AYRI dosyalardadır. `BlockCreateView`
// kayıttan sonra `?proje=…&blok=…` kurar (:152-153), `BulkUnitCreateView` onu
// okur (:127-128). Anahtar bir gün değişirse (örn. `proje` → `project`) biri
// güncellenip öteki atlanır; TypeScript hiçbir şey söylemez, çünkü iki tarafın
// da tipi `string`tir. Zincir SESSİZCE kopar: kullanıcı boş seçicili bir ekrana
// düşer ve bunu yalnız e2e görür.
//
// KURAL: bu anahtarlar üretim kodunda TEK bir modülde tanımlanır
// (`src/lib/navigation-params.ts`); kullanan her ekran onu İTHAL EDER.
//
// ─── Neden ESLint kuralı DEĞİL ──────────────────────────────────────────────
// `eslint.config.mjs` bu depoda yalnız `next/core-web-vitals` + `next/typescript`
// uzantılarından ibarettir, özel kural emsali yoktur. Buna karşılık
// `src/test-guards/` (`internal-url-guard`, `visual-frame-guard`,
// `symbol-subset-guard`) yerleşik desendir. Bekçi bu yüzden BURAYA yazıldı.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { PROJECT_PARAM, BLOCK_PARAM } from "@/lib/navigation-params";
import { routes } from "@/lib/routes";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));
const PARAMS_MODULE = path.join(SRC_DIR, "lib/navigation-params.ts");

/** Bekçinin koruduğu anahtar sabitleri. */
const GUARDED_NAMES = ["PROJECT_PARAM", "BLOCK_PARAM"] as const;

export interface ParamRedeclaration {
  line: number;
  name: string;
}

/**
 * `const X = "…"` BİÇİMİNDEKİ tanımı arar — anma değil, TANIM.
 *
 * Regex bilerek dardır: `const` anahtar sözcüğü + ad + `=` şart koşulur, bu
 * yüzden yorumdaki `` `PROJECT_PARAM` ile aynı anahtar `` ya da koddaki
 * `searchParams.get(PROJECT_PARAM)` kullanımı EŞLEŞMEZ. Aşağıdaki POZİTİF
 * KONTROL bunu ayrıca ölçer; olmasaydı bekçi olgu değil SÖZCÜK sayardı.
 */
export function findParamRedeclarations(source: string): ParamRedeclaration[] {
  const names = GUARDED_NAMES.join("|");
  const re = new RegExp(`(?:^|[;{}\\s])(?:export\\s+)?const\\s+(${names})\\s*=`, "g");
  const hits: ParamRedeclaration[] = [];
  source.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(re)) {
      hits.push({ line: index + 1, name: match[1] });
    }
  });
  return hits;
}

function productionSourceFiles(dir: string = SRC_DIR): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...productionSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry) || /\.testkit\.ts$/.test(entry)) continue;
    files.push(full);
  }
  return files;
}

describe("paylasilan URL parametre anahtari bekcisi", () => {
  it("taranacak en az bir uretim dosyasi bulunur (kapsam bos KALMAZ)", () => {
    // Bu iddia olmadan bekçi, tarama yolu bozulduğunda HİÇBİR ŞEYİ taramadan
    // yeşil geçerdi.
    expect(productionSourceFiles().length).toBeGreaterThan(100);
  });

  // ─── SÖZLEŞME ─────────────────────────────────────────────────────────────
  it("ortak modul TEL degerlerini aynen tasir (`proje` · `blok`)", () => {
    // Bu değerler canlı URL'lerdir: e2e `?proje=p-1&blok=blk-1` ile gezer,
    // kullanıcıların kaydettiği bağlantılar bu anahtarları içerir. Ortak modüle
    // taşınmak onları DEĞİŞTİRMEZ.
    expect(PROJECT_PARAM).toBe("proje");
    expect(BLOCK_PARAM).toBe("blok");
  });

  // ─── POZİTİF KONTROL ──────────────────────────────────────────────────────
  // "Her şeye kızan" bozuk bir kural da yeşil görünür; bekçinin İZİN VERİLEN
  // kullanımı GEÇİRDİĞİ ayrıca ölçülmelidir.
  it("POZITIF KONTROL — ithal + kullanim + yorumda anma ihlal SAYILMAZ", () => {
    const allowed = [
      `import { PROJECT_PARAM, BLOCK_PARAM } from "@/lib/navigation-params";`,
      `const projeParam = searchParams.get(PROJECT_PARAM);`,
      `params.set(PROJECT_PARAM, projectId);`,
      `// Seçili proje URL'de taşınır; \`PROJECT_PARAM\` ile aynı anahtar.`,
      `/** \`BulkUnitCreateView\` BLOCK_PARAM adını okur. */`,
      `const urlParams = new URLSearchParams({ [PROJECT_PARAM]: id, [BLOCK_PARAM]: blockId });`,
    ].join("\n");
    expect(findParamRedeclarations(allowed)).toEqual([]);
  });

  it("NEGATIF KONTROL — yerel yeniden tanim YAKALANIR (dogru sebeple)", () => {
    const leaked = [
      `const PROJECT_PARAM = "proje";`,
      `export const BLOCK_PARAM = "blok";`,
    ].join("\n");
    expect(findParamRedeclarations(leaked)).toEqual([
      { line: 1, name: "PROJECT_PARAM" },
      { line: 2, name: "BLOCK_PARAM" },
    ]);
  });

  // ─── ASIL İDDİA ───────────────────────────────────────────────────────────
  it("PROJECT_PARAM/BLOCK_PARAM YALNIZ src/lib/navigation-params.ts'te tanimlidir", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles()) {
      if (file === PARAMS_MODULE) continue; // kaynağın KENDİSİ
      for (const hit of findParamRedeclarations(readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(SRC_DIR, file)}:${hit.line} — ${hit.name}`);
      }
    }
    const message =
      `${offenders.length} yerel yeniden tanim. Bu anahtarlar ekranlar ARASI bir ` +
      `sozlesmedir (uretici ?proje=&blok= kurar, tuketici okur); kopyalanirlarsa ` +
      `bir sonraki ad degisikliginde zincir derleme hatasi VERMEDEN kopar. ` +
      `src/lib/navigation-params.ts'ten ithal edin:\n${offenders.join("\n")}`;
    expect(offenders, message).toEqual([]);
  });

  // ─── ZİNCİR BEKÇİSİ ───────────────────────────────────────────────────────
  it("routes.documents() ortak PROJECT_PARAM anahtarini uretir", () => {
    // `routes.ts:234` anahtarı düz nesne alanı olarak yazar (`qs({ proje: … })`),
    // `ArchiveDocumentsView` ise sabitle OKUR. İkisi ayrı dosyada olduğu için
    // ortak sabit yeniden adlandırılırsa bu iddia kırılır ve routes.ts'i işaret
    // eder — tek dış tanık budur.
    expect(routes.documents({ projectId: "p-1" })).toBe(`/belgeler?${PROJECT_PARAM}=p-1`);
  });

  it("blok -> toplu uretim zinciri iki anahtari da ayni telde tasir (BE 109)", () => {
    // `BlockCreateView:152-153` kurar, `BulkUnitCreateView:127-128` okur.
    // e2e `unit-bulk-import-allocation.spec.ts:320` bu tam dizeyi bekler.
    const wire = new URLSearchParams({
      [PROJECT_PARAM]: "p-1",
      [BLOCK_PARAM]: "blk-new-1",
    }).toString();
    expect(wire).toBe("proje=p-1&blok=blk-new-1");
    const parsed = new URLSearchParams(wire);
    expect(parsed.get(PROJECT_PARAM)).toBe("p-1");
    expect(parsed.get(BLOCK_PARAM)).toBe("blk-new-1");
  });
});

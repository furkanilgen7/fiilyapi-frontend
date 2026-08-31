// @vitest-environment node
//
// URL-1 T2 · KAÇAK URL BEKÇİSİ.
//
// KÖK OLAY: `/projeler/<uuid>` biçimi ad slug'ına çevrilecek. Ölçüldüğünde bu
// yol kodda ONLARCA yerde elle string birleştirilerek kuruluyordu. Biçimi
// değiştirmek her noktayı tek tek elden geçirmek demekti ve ATLANAN bir nokta
// SESSİZCE bozuk link üretirdi — kusur ancak kullanıcı tıklayınca görülür.
//
// `src/lib/routes.ts` bu üretimi tek yere topladı. Bu bekçi olmadan o
// toplanma ALTI AY İÇİNDE ERİR: bir sonraki dilim yine `` `/projeler/${id}` ``
// yazar, kimse fark etmez ve merkezîlik kâğıt üstünde kalır.
//
// KURAL: uygulama içi bir rota, ÜRETİM kodunda düz metin olarak yazılamaz;
// `routes.*` üreticisinden geçmelidir.
//
// ─── Neden ESLint kuralı DEĞİL ──────────────────────────────────────────────
// ÖLÇÜLDÜ: `eslint.config.mjs` bu depoda `next/core-web-vitals` +
// `next/typescript` uzantılarından İBARETTİR — tek bir özel kural yoktur, yani
// özel kural yazmanın bir emsali yok. Buna karşılık `src/test-guards/`
// (`visual-frame-guard`, `symbol-subset-guard`) ve kaynak tarayan testler
// (`field-adoption.test.ts`, `purchase-request-approval.source.test.ts`)
// yerleşik desendir. Bekçi bu yüzden BURAYA, deponun kendi deseniyle yazıldı.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));
const APP_DIR = path.join(SRC_DIR, "app");
const ROUTES_MODULE = path.join(SRC_DIR, "lib/routes.ts");

/* ───────────────────────── yorum ayıklayıcı ─────────────────────────────── */

/**
 * Yorum GÖVDELERİNİ boşlukla değiştirir; satır/sütun korunur.
 *
 * 🔴 BU ADIM ZORUNLUDUR ve bu bekçinin en kolay atlanan parçasıdır: bu depoda
 * yorumlar rota yollarını BOL BOL anar ("`/projeler/[projectId]/ozet`"),
 * dolayısıyla ham `grep` sözcük sayar, OLGU saymaz. Yorumları ayıklamayan bir
 * ölçüm bu dilimin planlanmasında da fiilen yanlış sayı üretti.
 */
export function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let state: "code" | "line" | "block" | "single" | "double" | "template" = "code";
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (state === "code") {
      if (c === "/" && d === "/") {
        state = "line";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === "/" && d === "*") {
        state = "block";
        out += "  ";
        i += 2;
        continue;
      }
      if (c === "'") state = "single";
      else if (c === '"') state = "double";
      else if (c === "`") state = "template";
      out += c;
      i += 1;
      continue;
    }
    if (state === "line") {
      if (c === "\n") state = "code";
      out += c === "\n" ? c : " ";
      i += 1;
      continue;
    }
    if (state === "block") {
      if (c === "*" && d === "/") {
        state = "code";
        out += "  ";
        i += 2;
        continue;
      }
      out += c === "\n" ? c : " ";
      i += 1;
      continue;
    }
    // Metin sabiti içindeyiz: kaçış dizisi bir sonraki karakteri YUTAR,
    // yoksa `"\\"` kapanışı kaçırılır ve tarayıcı senkronu bozulur.
    out += c;
    if (c === "\\") {
      out += source[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (
      (state === "single" && c === "'") ||
      (state === "double" && c === '"') ||
      (state === "template" && c === "`")
    ) {
      state = "code";
    }
    i += 1;
  }
  return out;
}

/* ───────────────────────── korunan rota kökleri ─────────────────────────── */

/**
 * Korunan kökler DOSYA SİSTEMİNDEN türetilir, elle yazılmış bir listeden
 * DEĞİL — yeni bir modül klasörü açıldığı anda bekçinin kapsamına kendiliğinden
 * girer (`route-tree.testkit.ts`in aynı gerekçesi).
 */
function filesystemRouteRoots(): string[] {
  const roots = new Set<string>();
  for (const groupDir of [APP_DIR, path.join(APP_DIR, "(app)")]) {
    for (const entry of readdirSync(groupDir)) {
      const full = path.join(groupDir, entry);
      if (!statSync(full).isDirectory()) continue;
      // `(app)` rota grubu, `[...slug]` catch-all ve `api` (BFF SUNUCU yolları,
      // uygulama içi rota DEĞİL) kök adı üretmez.
      if (entry.startsWith("(") || entry.startsWith("[") || entry === "api") continue;
      roots.add(entry);
    }
  }
  return [...roots];
}

/**
 * Kabuk nav'ında bağlantısı olan ama rotası HENÜZ YAZILMAMIŞ kökler
 * (`[...slug]` ComingSoon'a düşerler, bu yüzden dosya sisteminde klasörleri
 * yok). Rotaları açıldığında bu listeden düşerler; `filesystemRouteRoots`
 * onları kendiliğinden kapsar ve tekrar sayılmaları zararsızdır.
 */
// F-RAPOR: `raporlar` bu listeden DÜŞTÜ — `/raporlar` artık gerçek bir
// klasördür ve `filesystemRouteRoots()` onu kendiliğinden kapsar.
const UNWRITTEN_ROUTE_ROOTS = ["sirket-varliklari"];

export function guardedRouteRoots(): string[] {
  return [...new Set([...filesystemRouteRoots(), ...UNWRITTEN_ROUTE_ROOTS])].sort();
}

/* ───────────────────────────── tarayıcı ─────────────────────────────────── */

export interface UrlLeak {
  line: number;
  literal: string;
}

/**
 * Yorumları ayıkladıktan sonra, korunan bir kökle BAŞLAYAN her metin sabitini
 * (düz ya da şablon) kaçak sayar.
 *
 * Kök adının ardından yol sonu / `/` / `?` / `#` / `${` gelmesi ŞARTTIR:
 * `"/stoklama"` gibi ilgisiz bir metin `/stok` köküne takılmaz.
 */
export function findInternalUrlLeaks(source: string, roots: readonly string[]): UrlLeak[] {
  const alternatives = roots.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const leakRe = new RegExp(
    `(['"\`])(/(?:${alternatives}))(?=\\1|[/?#]|\\$\\{)([^'"\`\\n]*)\\1?`,
    "g",
  );
  const leaks: UrlLeak[] = [];
  stripComments(source)
    .split("\n")
    .forEach((line, index) => {
      for (const match of line.matchAll(leakRe)) {
        leaks.push({ line: index + 1, literal: `${match[2]}${match[3]}` });
      }
    });
  return leaks;
}

/* ─────────────────────────── taranacak dosyalar ─────────────────────────── */

function productionSourceFiles(dir: string = SRC_DIR): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...productionSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    // Testler ve test yardımcıları HARİÇ: gerekçe aşağıdaki `it` başlığında.
    if (/\.test\.tsx?$/.test(entry) || /\.testkit\.ts$/.test(entry)) continue;
    if (full === ROUTES_MODULE) continue; // üreticinin KENDİSİ
    files.push(full);
  }
  return files;
}

/* ──────────────────────────────── testler ───────────────────────────────── */

describe("kacak URL bekcisi — uygulama ici rotalar yalniz src/lib/routes.ts'ten uretilir", () => {
  const roots = guardedRouteRoots();

  it("korunan kok kumesi DOLUDUR ve `projeler`i icerir (kapsam bos KALMAZ)", () => {
    // 🔴 Bu iddia olmadan bekçi, kök kümesi kazara boşaldığında (klasör
    // yeniden düzenlemesi, yol hatası) HİÇBİR ŞEYİ taramadan yeşil geçerdi.
    expect(roots.length).toBeGreaterThan(10);
    expect(roots).toContain("projeler");
    expect(roots).toContain("hakedisler");
  });

  it("taranacak en az bir uretim dosyasi bulunur (kapsam bos KALMAZ)", () => {
    expect(productionSourceFiles().length).toBeGreaterThan(100);
  });

  // ─── POZİTİF KONTROL ──────────────────────────────────────────────────────
  // 🔴 K-IKIZ1: "her şeye kızan" bozuk bir kural da yeşil görünür. Bekçinin
  // İZİN VERİLEN kullanımı GEÇİRDİĞİ ayrıca ölçülür, yoksa yukarıdaki asıl
  // iddia bir bekçiyi değil bir yanılsamayı doğrular.
  it("POZITIF KONTROL — routes.* uzerinden kurulan href kacak SAYILMAZ", () => {
    const allowed = [
      `const href = routes.projects.detail({ projectId });`,
      `<Link href={routes.projects.sites.timesheet({ projectId, siteId, section })}>`,
      `router.push(routes.progressPayments.subcontractor.detail({ paymentId: created.id }));`,
      `const backend = "/api/backend/projects";`,
      `const unrelated = "/stoklama-rehberi";`,
      `const apiPath = \`/projects/\${id}/sites\`;`,
    ].join("\n");
    expect(findInternalUrlLeaks(allowed, roots)).toEqual([]);
  });

  it("POZITIF KONTROL — yorum icindeki rota anmasi kacak SAYILMAZ", () => {
    // Yorumlar bu depoda rota yollarını bol bol anar; ayıklama çalışmazsa
    // bekçi olgu değil SÖZCÜK sayar ve yanlış yere kızar.
    const commented = [
      `// Eski hedef \`/projeler/\${projectId}/ozet\` idi; artik routes.projects.summary.`,
      `/* "/hakedisler/taseron" satiri buraya tasindi. */`,
      `const href = routes.projects.summary({ projectId });`,
    ].join("\n");
    expect(findInternalUrlLeaks(commented, roots)).toEqual([]);
  });

  it("NEGATIF KONTROL — elle kurulan rota YAKALANIR (dogru sebeple)", () => {
    const leaked = [
      `const href = \`/projeler/\${projectId}/santiyeler/\${siteId}\`;`,
      `<Link href="/hakedisler/taseron">Taseron</Link>`,
    ].join("\n");
    const leaks = findInternalUrlLeaks(leaked, roots);
    expect(leaks.map((l) => l.literal)).toEqual([
      "/projeler/${projectId}/santiyeler/${siteId}",
      "/hakedisler/taseron",
    ]);
  });

  // ─── ASIL İDDİA ───────────────────────────────────────────────────────────
  // Testler ve `e2e/` KAPSAM DIŞIDIR ve bu BİLİNÇLİDİR: onların URL'yi ELLE
  // yazması bir bekçidir. `routes.ts` bir gün yanlış bir yol üretirse,
  // yardımcıyı kullanan bir iddia onunla BİRLİKTE kayar ve hiçbir şey
  // kırılmaz. Bağımsız kalan 400+ elle yazılmış URL iddiası bu göçün
  // tek gerçek dış tanığıdır.
  it("URETIM kodunda elle kurulmus uygulama ici URL YOKTUR", () => {
    const offenders: string[] = [];
    for (const file of productionSourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const leak of findInternalUrlLeaks(source, roots)) {
        offenders.push(`${path.relative(SRC_DIR, file)}:${leak.line} — "${leak.literal}"`);
      }
    }
    const message =
      `${offenders.length} kacak URL — bunlar src/lib/routes.ts uzerinden kurulmalidir ` +
      `(yoksa bir sonraki bicim degisikliginde SESSIZCE bozuk link uretirler):\n` +
      offenders.join("\n");
    expect(offenders, message).toEqual([]);
  });
});

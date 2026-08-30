// @vitest-environment node
//
// DOM YOK: bu dosya katalog VERİSİNİ ve KAYNAK METNİNİ sınar. Node ortamı
// ZORUNLUDUR — jsdom altında `import.meta.url` bir `file:` URL değildir ve
// kaynak taraması "The URL must be of scheme file" ile patlar.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildRouteTree, resolveHrefIn } from "@/components/shell/route-tree.testkit";
import { routes } from "@/lib/routes";

import { REPORT_CATEGORIES, allReportRows, isLinkedRow } from "./reports-catalog";

/**
 * F-RAPOR · KATALOĞUN BEKÇİLERİ.
 *
 * Bu dosya ekranı KURMADAN katalog verisini sınar; DOM iddiaları ikiz
 * dosyadadır (`ReportsCatalogView.test.tsx`).
 */

const ROUTE_TREE = buildRouteTree();

describe("R2 — her etkin href `routes.ts` üreticisinden gelir", () => {
  /**
   * 🔴 MUTASYON HEDEFİ: satıra elle yol string'i (`href: "/stok"`) yazmak.
   *
   * İddia METİN düzeyindedir çünkü çalışma-anı karşılaştırması (üretilen href
   * `routes.stock()`e eşit mi) elle yazılmış BİREBİR AYNI string'i de geçirirdi
   * — yani mutasyon SAĞ KALIRDI. Kaynak taraması onu yakalar.
   *
   * (Depo genelindeki `internal-url-guard.test.ts` de bu dosyayı tarar; oradaki
   * bekçi TÜM `src/`i kapsar, buradaki bu dosyaya ODAKLANIR ve kırıldığında
   * hangi dilimin kuralının çiğnendiğini SÖYLER.)
   */
  it("katalog kaynağında elle yazılmış uygulama içi yol YOKTUR", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./reports-catalog.ts", import.meta.url)),
      "utf8",
    );
    // 🔴 YORUMLAR SOYULUR, DİZELER SOYULMAZ (`internal-url-guard` ile aynı
    // ayrım): bu dosyanın yorumları hedef ekranları ADLARIYLA anlatır
    // (`/mali-tablolar`, `/bordro/sgk`) ve onları kaçak saymak bekçiyi
    // yorumları budamaya zorlardı — açıklama kaybı, koruma kazancı sıfır.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const literals = [...code.matchAll(/["'`](\/[a-zA-Z][^"'`\n]*)["'`]/g)].map((m) => m[1]);
    expect(literals).toEqual([]);
  });

  it("etkin satırların href'leri bilinen üreticilerin çıktısıdır", () => {
    const produced = new Set([
      routes.financialStatements.root(),
      routes.timesheet(),
      routes.payroll.sgk(),
      routes.stock(),
      routes.purchasing.suppliers(),
    ]);
    for (const row of allReportRows()) {
      if (!isLinkedRow(row)) continue;
      expect(produced.has(row.href), `"${row.title}" href="${row.href}"`).toBe(true);
    }
  });
});

describe("R3 — etkin satırların hedefi GERÇEKTEN vardır", () => {
  it("route ağacı okunur (sağlık kontrolü)", () => {
    expect(ROUTE_TREE.literalChildren.has("projeler")).toBe(true);
  });

  /**
   * 🔴 Hedefler DOSYA SİSTEMİNDEN doğrulanır (nav href guard'ın aynı
   * yardımcısı). Elle yazılmış bir "geçerli yollar" listesi, rota klasörü
   * silindiğinde de yeşil kalırdı.
   *
   * `catch-all` BURADA GEÇERSİZDİR — nav'ın aksine: nav'da catch-all "modül
   * henüz yazılmadı" demektir ve kabul edilir, katalogda ise kullanıcıya
   * ÇALIŞAN bir rapor vaat edip "yakında" ekranına düşürmek olurdu. Bu ayrım
   * bu bekçinin bütün noktasıdır.
   */
  it("her etkin href STATİK bir sayfaya düşer (catch-all DEĞİL)", () => {
    const linked = allReportRows().filter(isLinkedRow);
    expect(linked.length).toBeGreaterThan(0);
    for (const row of linked) {
      expect(
        resolveHrefIn(ROUTE_TREE, row.href, false),
        `"${row.title}" (href="${row.href}")`,
      ).toEqual({ kind: "static" });
    }
  });

  /**
   * POZİTİF KONTROL: yukarıdaki iddia `resolveHrefIn` her şeye
   * `{kind:"static"}` döndürecek şekilde bozulsa da yeşil kalırdı.
   */
  it("kontrol grubu: uydurma bir yol statik ÇIKMAZ", () => {
    expect(resolveHrefIn(ROUTE_TREE, "/boyle-bir-rapor-yok", false)).toEqual({
      kind: "catch-all",
    });
  });
});

describe("R4 — satırın iki hâli birbirini DIŞLAR", () => {
  it("her satır ya bağlantıdır ya gerekçelidir; ikisi birden DEĞİL", () => {
    for (const row of allReportRows()) {
      const hasHref = row.href !== undefined;
      const hasReason = row.reason !== undefined;
      expect(hasHref !== hasReason, `"${row.title}"`).toBe(true);
    }
  });

  it("her devre dışı satırın gerekçesi BOŞ DEĞİLDİR", () => {
    for (const row of allReportRows()) {
      if (isLinkedRow(row)) continue;
      expect(row.reason.trim().length, `"${row.title}"`).toBeGreaterThan(10);
    }
  });
});

describe("mockup yapısı (Raporlar.dc.html)", () => {
  it("R66 — DÖRT kategori, mockup sırasında", () => {
    expect(REPORT_CATEGORIES.map((c) => c.title)).toEqual([
      "Mali Raporlar", // R72
      "Saha Raporları", // R110
      "İK Raporları", // R146
      "Stok & Satınalma", // R175
    ]);
  });

  it("kategori satır sayıları mockup'la aynıdır (4+4+3+3 = 14)", () => {
    expect(REPORT_CATEGORIES.map((c) => c.rows.length)).toEqual([4, 4, 3, 3]);
    expect(allReportRows()).toHaveLength(14);
  });

  /**
   * 🔴 Mockup her satıra İKİ çip çizmez: R123/R129/R159 yalnız `PDF`,
   * R165/R188/R194 yalnız `XLS` taşır. Hepsine `["XLS","PDF"]` vermek
   * mockup'tan sapma olurdu ve kimse fark etmezdi.
   */
  it("biçim çipleri mockup'ın çizdiği kümedir", () => {
    const byKey = new Map(allReportRows().map((r) => [r.key, r.formats]));
    expect(byKey.get("santiye-gunlugu")).toEqual(["PDF"]); // R123
    expect(byKey.get("is-guvenligi")).toEqual(["PDF"]); // R129
    expect(byKey.get("sgk")).toEqual(["PDF"]); // R159
    expect(byKey.get("iscilik-maliyet")).toEqual(["XLS"]); // R165
    expect(byKey.get("satinalma-ozeti")).toEqual(["XLS"]); // R188
    expect(byKey.get("fiyat-karsilastirma")).toEqual(["XLS"]); // R194
    expect(byKey.get("gelir-gider")).toEqual(["XLS", "PDF"]); // R78-79
  });

  it("satır anahtarları benzersizdir (data-testid çakışması olmaz)", () => {
    const keys = allReportRows().map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

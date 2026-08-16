import { describe, expect, it } from "vitest";

import { buildRouteTree, resolveHrefIn } from "@/components/shell/route-tree.testkit";

import {
  FINANCIAL_NAV_HEADING,
  FINANCIAL_NAV_PARENT,
  FINANCIAL_SIBLING_NAV,
  FINANCIAL_SUB_NAV,
  activeFinancialNavLabels,
  isFinancialNavItemAncestor,
  isFinancialNavItemCurrent,
} from "./financial-statements-nav-config";

describe("Mali Tablolar drill nav — BL:24-31 birebir", () => {
  it("grup başlığı BL:25'in metnidir", () => {
    expect(FINANCIAL_NAV_HEADING).toBe("Sözleşme & Mali");
  });

  it("BL:26 kardeş modül `Muhasebe`dir ve alt sekmelerin DIŞINDADIR", () => {
    expect(FINANCIAL_SIBLING_NAV.map((i) => i.label)).toEqual(["Muhasebe"]);
    expect(FINANCIAL_SIBLING_NAV[0]).toMatchObject({
      kind: "link",
      href: "/muhasebe",
      exact: false,
    });
  });

  it("BL:27 üst öğe `/mali-tablolar`a giden EXACT bir bağlantıdır", () => {
    // 🔴 `exact: true` ŞART: aksi hâlde `isActivePath`in prefix kuralı üst
    // öğeyi `/mali-tablolar/bilanco`da da CURRENT sayar ve sayfada İKİ
    // `aria-current="page"` doğardı (a11y kırığı). Mockup'ın istediği çift
    // vurgu `--ancestor` katmanıyla verilir, `aria-current` ile DEĞİL.
    expect(FINANCIAL_NAV_PARENT).toMatchObject({
      kind: "link",
      label: "Mali Tablolar",
      href: "/mali-tablolar",
      exact: true,
    });
  });

  it("alt sekmeler mockup'ın SIRASIYLA üç tanedir (BL:28-30)", () => {
    expect(FINANCIAL_SUB_NAV.map((i) => i.label)).toEqual([
      "Gelir Tablosu",
      "Bilanço",
      "Nakit Akışı",
    ]);
  });

  it("`Bilanço` ve `Nakit Akışı` EXACT bağlantıdır, `Gelir Tablosu` DEĞİLDİR", () => {
    expect(FINANCIAL_SUB_NAV[1]).toMatchObject({
      kind: "link",
      href: "/mali-tablolar/bilanco",
      exact: true,
    });
    expect(FINANCIAL_SUB_NAV[2]).toMatchObject({
      kind: "link",
      href: "/mali-tablolar/nakit-akisi",
      exact: true,
    });
    expect(FINANCIAL_SUB_NAV[0]?.kind).toBe("disabled");
  });
});

describe("🔴 devre dışı `Gelir Tablosu` GERÇEK bir gerekçe taşır", () => {
  // 🔴 F-PRJTAB kanonu: görünür gerekçe öğenin KENDİ alanından TÜRER — testte
  // de öyle okunur. Ekran yazıldığında gerekçe kendiliğinden kaybolur.
  it("gerekçe içi boş bir cümle değildir ve ÖLÇÜLMÜŞ olguyu söyler", () => {
    const disabled = FINANCIAL_SUB_NAV.filter((i) => i.kind === "disabled");
    // Boş küme üzerinde dönen bir `for` HİÇBİR ŞEY kanıtlamaz.
    expect(disabled).toHaveLength(1);
    for (const item of disabled) {
      expect(item.reason.length).toBeGreaterThan(20);
      // Ölçüm: `schema.d.ts`te `income-statement|IncomeStatement|profit-loss`
      // için SIFIR eşleşme var — uç ayrı bir backend dilimidir (MT-2).
      expect(item.reason).toMatch(/backend|MT-2/);
    }
  });
});

describe("🔴 K7 · İKİ KATMANLI aktiflik bekçisi", () => {
  const ALL = [FINANCIAL_NAV_PARENT, ...FINANCIAL_SUB_NAV, ...FINANCIAL_SIBLING_NAV];

  function currentLabels(pathname: string): string[] {
    return ALL.filter((item) => isFinancialNavItemCurrent(pathname, item)).map((i) => i.label);
  }

  it("`/mali-tablolar/bilanco`da TEK bir öğe CURRENT'tır; üst öğe ATA'dır", () => {
    expect(currentLabels("/mali-tablolar/bilanco")).toEqual(["Bilanço"]);
    expect(isFinancialNavItemCurrent("/mali-tablolar/bilanco", FINANCIAL_NAV_PARENT)).toBe(false);
    expect(isFinancialNavItemAncestor("/mali-tablolar/bilanco", FINANCIAL_NAV_PARENT)).toBe(true);
  });

  it("`/mali-tablolar/nakit-akisi`da da TEK CURRENT + ATA üst öğe", () => {
    expect(currentLabels("/mali-tablolar/nakit-akisi")).toEqual(["Nakit Akışı"]);
    expect(isFinancialNavItemAncestor("/mali-tablolar/nakit-akisi", FINANCIAL_NAV_PARENT)).toBe(
      true,
    );
  });

  it("kökte `/mali-tablolar` üst öğe CURRENT'tır ve ATA DEĞİLDİR", () => {
    expect(currentLabels("/mali-tablolar")).toEqual(["Mali Tablolar"]);
    // 🔴 İkisi BİRDEN doğru olsaydı satır hem `aria-current` alır hem soluk
    // "ata" tonuna düşerdi; ikisi karşılıklı DIŞLAYICIdır.
    expect(isFinancialNavItemAncestor("/mali-tablolar", FINANCIAL_NAV_PARENT)).toBe(false);
  });

  it("`activeFinancialNavLabels` üç yolda da TEK etiket döner", () => {
    expect(activeFinancialNavLabels("/mali-tablolar")).toEqual(["Mali Tablolar"]);
    expect(activeFinancialNavLabels("/mali-tablolar/bilanco")).toEqual(["Bilanço"]);
    expect(activeFinancialNavLabels("/mali-tablolar/nakit-akisi")).toEqual(["Nakit Akışı"]);
  });

  it("devre dışı öğe HİÇBİR yolda ne CURRENT ne ATA olabilir", () => {
    const disabled = FINANCIAL_SUB_NAV.filter((i) => i.kind === "disabled");
    expect(disabled).toHaveLength(1);
    for (const item of disabled) {
      expect(isFinancialNavItemCurrent("/mali-tablolar", item)).toBe(false);
      expect(isFinancialNavItemAncestor("/mali-tablolar/bilanco", item)).toBe(false);
    }
  });

  it("kardeş modül yolunda mali tablo sekmelerinin HİÇBİRİ aktif değildir", () => {
    expect(activeFinancialNavLabels("/muhasebe/mizan")).toEqual(["Muhasebe"]);
  });
});

describe("kırık link koruması — yüzey nav bekçisine KAYDEDİLİR", () => {
  const ROUTE_TREE = buildRouteTree();
  const LINKS = [FINANCIAL_NAV_PARENT, ...FINANCIAL_SUB_NAV, ...FINANCIAL_SIBLING_NAV].filter(
    (item) => item.kind === "link",
  );

  /**
   * 🔴 T2 KAPSAMI: bu dilim `/mali-tablolar/bilanco` EKRANINI ve `/mali-tablolar`
   * KÖPRÜ rotasını yazar (kök rota, `bilanco` klasörü doğduğu anda catch-all'ın
   * kapsamından çıktığı için ZORUNLUdur — bkz. o dosyanın başlığı).
   *
   * `Nakit Akışı` KARDEŞ bir görevin (T3) dosyasıdır; bugün hâlâ `[...slug]`
   * catch-all'ına (ComingSoon) düşer. O görev rotasını yazınca bu küme
   * BOŞALMALIDIR — küme sayılıdır, sessizce büyüyemez.
   */
  const PENDING_ROUTE_HREFS = new Set(["/mali-tablolar/nakit-akisi"]);

  it("hiçbir bağlantı dinamik bir segmente ya da hiçliğe düşmez", () => {
    for (const item of LINKS) {
      const result = resolveHrefIn(ROUTE_TREE, item.href, false);
      expect(
        result.kind === "static" || result.kind === "catch-all",
        `"${item.label}" (${item.href}) geçersiz: ${JSON.stringify(result)}`,
      ).toBe(true);
    }
  });

  it("🔴 BU dilimin açtığı yol GERÇEK statik rotadır (catch-all DEĞİL)", () => {
    // Bir sekme LİNK'e çevrilip rotası açılmazsa kullanıcı "açıldı" sanılan
    // boş bir ComingSoon ekranı görür (F-MU2 dersi).
    expect(resolveHrefIn(ROUTE_TREE, "/mali-tablolar/bilanco", false)).toEqual({
      kind: "static",
    });
    expect(resolveHrefIn(ROUTE_TREE, "/muhasebe", false)).toEqual({ kind: "static" });
  });

  it("bekleyen rotalar SAYILIDIR — sessizce büyüyemez", () => {
    const pending = LINKS.filter(
      (item) => resolveHrefIn(ROUTE_TREE, item.href, false).kind !== "static",
    ).map((item) => item.href);
    expect(new Set(pending)).toEqual(PENDING_ROUTE_HREFS);
  });
});

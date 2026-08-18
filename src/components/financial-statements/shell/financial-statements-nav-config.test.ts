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
  isFinancialNavItemMirrorCurrent,
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
    // 🔴 F-MT2 K3 — artık `disabled` DEĞİL, üst öğeyi YANSITAN işaretçi.
    expect(FINANCIAL_SUB_NAV[0]).toEqual({
      kind: "mirror",
      label: "Gelir Tablosu",
      mirrorsHref: "/mali-tablolar",
    });
  });
});

describe("🔴 F-MT2 K3 · `Gelir Tablosu` satırı ÜST ÖĞEYLE AYNI HEDEFİ yansıtır", () => {
  const MIRRORS = FINANCIAL_SUB_NAV.filter((i) => i.kind === "mirror");

  it("küme SAYILIDIR ve hedefi üst öğenin href'iyle BİREBİR aynıdır", () => {
    // Boş küme üzerinde dönen bir `for` HİÇBİR ŞEY kanıtlamaz.
    expect(MIRRORS).toHaveLength(1);
    for (const item of MIRRORS) {
      // 🔴 Sabit bir dize yazmak yerine ÜST ÖĞEDEN türetilir: hedefler
      // ayrışırsa (ör. ayrı bir rota açılırsa) bu iddia kırmızı olur.
      expect(FINANCIAL_NAV_PARENT.kind).toBe("link");
      if (FINANCIAL_NAV_PARENT.kind !== "link") return;
      expect(item.mirrorsHref).toBe(FINANCIAL_NAV_PARENT.href);
    }
  });

  it("🔴 KÖKTE görsel olarak CURRENT'tır ama `aria-current` SÜRMEZ", () => {
    const mirror = MIRRORS[0];
    expect(mirror).toBeDefined();
    if (mirror === undefined) return;

    expect(isFinancialNavItemMirrorCurrent("/mali-tablolar", mirror)).toBe(true);
    // 🔴 K7 — aria-current katmanı ONU HİÇ SAYMAZ; saysaydı kökte iki tane
    // olurdu (üst öğe + bu satır) ve bekçi kırmızıya dönerdi.
    expect(isFinancialNavItemCurrent("/mali-tablolar", mirror)).toBe(false);
  });

  it("yaprak ekranlarda ne görsel CURRENT ne de `aria-current` olur", () => {
    const mirror = MIRRORS[0];
    if (mirror === undefined) return;
    for (const path of ["/mali-tablolar/bilanco", "/mali-tablolar/nakit-akisi", "/muhasebe"]) {
      expect(isFinancialNavItemMirrorCurrent(path, mirror)).toBe(false);
      expect(isFinancialNavItemCurrent(path, mirror)).toBe(false);
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

  it("bağlantı OLMAYAN öğe HİÇBİR yolda ne CURRENT ne ATA olabilir", () => {
    const nonLinks = FINANCIAL_SUB_NAV.filter((i) => i.kind !== "link");
    expect(nonLinks).toHaveLength(1);
    for (const item of nonLinks) {
      expect(isFinancialNavItemCurrent("/mali-tablolar", item)).toBe(false);
      expect(isFinancialNavItemAncestor("/mali-tablolar/bilanco", item)).toBe(false);
    }
  });

  /**
   * 🔴 K3 BEKÇİSİ ZAYIFLATILMADI — kural HÂLÂ "sayfa başına TEK aria-current".
   * Değişen tek şey satırın `disabled` yerine `mirror` olmasıdır; kökte
   * `aria-current` sayısı 1 KALIR.
   */
  it("🔴 kökte `aria-current` sayısı `mirror` satırdan SONRA da TEKtir", () => {
    expect(activeFinancialNavLabels("/mali-tablolar")).toHaveLength(1);
    expect(currentLabels("/mali-tablolar")).toEqual(["Mali Tablolar"]);
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
   * 🔴 T3'te BOŞALDI. T2 burada `/mali-tablolar/nakit-akisi`i bekliyordu
   * (o gün hâlâ `[...slug]` catch-all'ına, yani ComingSoon'a düşüyordu);
   * bu dilim rotayı YAZDI ve marker aynı commit'te kaldırıldı.
   *
   * Küme SAYILIDIR: sessizce büyüyemez, çünkü aşağıdaki iddia beklenen
   * kümeyi ölçülenle TAM eşitler. Yansıtıcı `Gelir Tablosu` (BL:28) bu
   * kümeye GİRMEZ — o bir `link` değildir, hiç çözümlenmez (hedefi zaten üst
   * öğenin href'idir ve O çözümlenir).
   */
  const PENDING_ROUTE_HREFS = new Set<string>([]);

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
    // 🔴 T3'ün açtığı yol: GERÇEK statik rota olduğu KANITLANIR. `link`e
    // çevrilip rotası açılmasaydı kullanıcı "açıldı" sanılan boş bir
    // ComingSoon ekranı görürdü (F-MU2 dersi).
    expect(resolveHrefIn(ROUTE_TREE, "/mali-tablolar/nakit-akisi", false)).toEqual({
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

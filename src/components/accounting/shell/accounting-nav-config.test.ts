import { describe, expect, it } from "vitest";

import { buildRouteTree, resolveHrefIn } from "@/components/shell/route-tree.testkit";

import {
  ACCOUNTING_SIBLING_NAV,
  ACCOUNTING_SUB_NAV,
  activeAccountingNavLabels,
  isAccountingNavItemActive,
} from "./accounting-nav-config";

describe("Muhasebe drill nav — HP:29-38 birebir", () => {
  it("alt sekmeler mockup'ın SIRASIYLA altı tanedir (HP:31-36)", () => {
    expect(ACCOUNTING_SUB_NAV.map((i) => i.label)).toEqual([
      "Yevmiye Defteri",
      "Hesap Planı",
      "Mizan",
      "Banka Mutabakatı",
      "e-Fatura",
      "KDV Beyanı",
    ]);
  });

  it("HP:37-38 kardeş modüller alt sekmelerin ALTINDADIR", () => {
    expect(ACCOUNTING_SIBLING_NAV.map((i) => i.label)).toEqual(["Hazine", "Mali Tablolar"]);
  });

  it("yalnız ilk iki alt sekme AKTİFtir, diğer dördü devre dışı", () => {
    const links = ACCOUNTING_SUB_NAV.filter((i) => i.kind === "link");
    expect(links.map((i) => i.label)).toEqual(["Yevmiye Defteri", "Hesap Planı"]);
    expect(ACCOUNTING_SUB_NAV.filter((i) => i.kind === "disabled")).toHaveLength(4);
  });
});

describe("🔴 devre dışı sekmeler GERÇEK bir gerekçe taşır", () => {
  const REASONS: Record<string, string> = {
    Mizan: "Mizan, MU-2 dilimiyle açılacak.",
    "Banka Mutabakatı": "Banka Mutabakatı'nın backend ucu henüz yok.",
    "e-Fatura": "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı).",
    "KDV Beyanı": "KDV Beyanı, MU-2 dilimiyle açılacak.",
  };

  it("dört gerekçe metni BİREBİR sabittir", () => {
    for (const item of ACCOUNTING_SUB_NAV) {
      if (item.kind !== "disabled") continue;
      expect(item.reason).toBe(REASONS[item.label]);
    }
  });

  it("hiçbir gerekçe İÇİ BOŞ bir cümle değildir", () => {
    // "bu ekran henüz açılmadı" gibi bilgi taşımayan metinler YASAK: gerekçe
    // hangi dilimde/hangi kararla geleceğini söylemek zorundadır.
    for (const item of ACCOUNTING_SUB_NAV) {
      if (item.kind !== "disabled") continue;
      expect(item.reason.length).toBeGreaterThan(20);
      expect(item.reason).toMatch(/MU-2|backend|ertelendi/);
    }
  });
});

describe("🔴 çift aktiflik bekçisi (F-SD T7 dersi)", () => {
  it("`/muhasebe` kök sekmesi EXACT'tir", () => {
    const root = ACCOUNTING_SUB_NAV.find((i) => i.label === "Yevmiye Defteri");
    expect(root).toMatchObject({ kind: "link", href: "/muhasebe", exact: true });
  });

  it("`/muhasebe/hesap-plani`de TEK bir öğe aktiftir", () => {
    // `exact` kaldırılırsa `isActivePath`in prefix kuralı "Yevmiye Defteri"ni
    // de aktif sayar ve bu dizi İKİ elemanlı olur.
    expect(activeAccountingNavLabels("/muhasebe/hesap-plani")).toEqual(["Hesap Planı"]);
  });

  it("`/muhasebe` kökünde TEK bir öğe aktiftir", () => {
    expect(activeAccountingNavLabels("/muhasebe")).toEqual(["Yevmiye Defteri"]);
  });

  it("kardeş modül yolunda muhasebe sekmelerinin HİÇBİRİ aktif değildir", () => {
    expect(activeAccountingNavLabels("/hazine")).toEqual(["Hazine"]);
  });

  it("devre dışı öğe HİÇBİR yolda aktif olamaz", () => {
    for (const item of ACCOUNTING_SUB_NAV) {
      if (item.kind !== "disabled") continue;
      expect(isAccountingNavItemActive("/muhasebe", item)).toBe(false);
    }
  });
});

describe("kırık link koruması", () => {
  const ROUTE_TREE = buildRouteTree();

  it("her bağlantı gerçek bir sayfaya ya da catch-all'a düşer", () => {
    for (const item of [...ACCOUNTING_SUB_NAV, ...ACCOUNTING_SIBLING_NAV]) {
      if (item.kind !== "link") continue;
      const result = resolveHrefIn(ROUTE_TREE, item.href, false);
      expect(
        result.kind === "static" || result.kind === "catch-all",
        `"${item.label}" (${item.href}) geçersiz: ${JSON.stringify(result)}`,
      ).toBe(true);
    }
  });

  it("iki AÇIK sekme GERÇEK statik rotadır (catch-all DEĞİL)", () => {
    expect(resolveHrefIn(ROUTE_TREE, "/muhasebe", false)).toEqual({ kind: "static" });
    expect(resolveHrefIn(ROUTE_TREE, "/muhasebe/hesap-plani", false)).toEqual({
      kind: "static",
    });
  });
});

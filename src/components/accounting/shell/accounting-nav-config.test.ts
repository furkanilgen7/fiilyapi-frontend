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

  // 🔴 F-MU2: iddia SİLİNMEDİ, YENİ GERÇEĞE TAŞINDI. Mizan ve KDV Beyanı'nın
  // EKRANLARI açıldı (backend'leri MU-2 ile zaten canlıydı) ⇒ aktif 2 → 4,
  // devre dışı 4 → 2. Kalan ikisinin gerekçesi DEĞİŞMEDİ.
  it("DÖRT alt sekme AKTİFtir, kalan ikisi devre dışı", () => {
    const links = ACCOUNTING_SUB_NAV.filter((i) => i.kind === "link");
    expect(links.map((i) => i.label)).toEqual([
      "Yevmiye Defteri",
      "Hesap Planı",
      "Mizan",
      "KDV Beyanı",
    ]);
    expect(ACCOUNTING_SUB_NAV.filter((i) => i.kind === "disabled")).toHaveLength(2);
  });
});

describe("🔴 devre dışı sekmeler GERÇEK bir gerekçe taşır", () => {
  // 🔴 F-MU2: harita 4 → 2 girdiye indi. Mizan/KDV artık BAĞLANTIDIR;
  // kalan ikisinin metni AYNEN durur — F-MU2 onların ucunu getirmedi.
  const REASONS: Record<string, string> = {
    "Banka Mutabakatı": "Banka Mutabakatı'nın backend ucu henüz yok.",
    "e-Fatura": "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı).",
  };

  it("iki gerekçe metni BİREBİR sabittir", () => {
    for (const item of ACCOUNTING_SUB_NAV) {
      if (item.kind !== "disabled") continue;
      expect(item.reason).toBe(REASONS[item.label]);
    }
  });

  it("hiçbir gerekçe İÇİ BOŞ bir cümle değildir", () => {
    // "bu ekran henüz açılmadı" gibi bilgi taşımayan metinler YASAK: gerekçe
    // hangi dilimde/hangi kararla geleceğini söylemek zorundadır.
    const disabled = ACCOUNTING_SUB_NAV.filter((i) => i.kind === "disabled");
    // 🔴 Boş küme üzerinde dönen bir `for` HİÇBİR ŞEY kanıtlamaz — kalan iki
    // öğenin gerçekten var olduğu ÖNCE ölçülür (F-MU2'de dört öğeden ikisi
    // düştü; sayı denetimi olmasa iddia sessizce körelirdi).
    expect(disabled).toHaveLength(2);
    for (const item of disabled) {
      expect(item.reason.length).toBeGreaterThan(20);
      expect(item.reason).toMatch(/backend|ertelendi/);
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

  // 🔴 F-MU2: bekçi İKİ YENİ YOLA genişletildi. Kök `exact: true` olduğu için
  // yeni alt yollar onu YAKMAZ; bunu iddia etmek testin işidir.
  it("`/muhasebe/mizan`de TEK bir öğe aktiftir", () => {
    expect(activeAccountingNavLabels("/muhasebe/mizan")).toEqual(["Mizan"]);
  });

  it("`/muhasebe/kdv-beyani`de TEK bir öğe aktiftir", () => {
    expect(activeAccountingNavLabels("/muhasebe/kdv-beyani")).toEqual(["KDV Beyanı"]);
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

  // 🔴 F-MU2: 2 → 4. Bir sekme LİNK'e çevrilip rotası açılmazsa catch-all
  // ComingSoon'a düşer ve kullanıcı "açıldı" sanılan boş bir ekran görür.
  it("DÖRT AÇIK sekme de GERÇEK statik rotadır (catch-all DEĞİL)", () => {
    for (const href of [
      "/muhasebe",
      "/muhasebe/hesap-plani",
      "/muhasebe/mizan",
      "/muhasebe/kdv-beyani",
    ]) {
      expect(resolveHrefIn(ROUTE_TREE, href, false), href).toEqual({ kind: "static" });
    }
  });
});

import { describe, expect, it } from "vitest";

import { buildRouteTree, resolveHrefIn } from "@/components/shell/route-tree.testkit";

import {
  ACCOUNTING_TABS,
  activeAccountingNavLabels,
  disabledTabReasons,
  isAccountingNavItemActive,
} from "./accounting-nav-config";

describe("Muhasebe modül sekmeleri — MP:105-112 (KK-10)", () => {
  it("sekmeler mockup'ın SIRASIYLA + Dönem Kapanışı ekiyle YEDİ tanedir", () => {
    // MP altı sekme çizer; `Dönem Kapanışı` ÖLÇÜLMÜŞ bir mockup boşluğudur
    // (ekran F-DKAP ile açıldı, canlıda ve kendi mockup'ı var) — düşürülseydi
    // ÇALIŞAN bir ekran yalnız URL yazarak ulaşılır hâle gelirdi.
    expect(ACCOUNTING_TABS.map((i) => i.label)).toEqual([
      "Yevmiye",
      "Hesap Planı",
      "Mizan",
      "Banka Mutabakatı",
      "e-Fatura",
      "KDV Beyanı",
      "Dönem Kapanışı",
    ]);
  });

  // 🔴 F-MUP: Banka Mutabakatı devre-dışıdan LİNK'e döndü (KK-10) ⇒
  // aktif 5 → 6, devre dışı 2 → 1. `e-Fatura` GİB entegrasyonu kullanıcı
  // kararıyla ertelendiği için TEK devre dışı sekme olarak kaldı.
  it("ALTI sekme AKTİFtir, yalnız e-Fatura devre dışıdır", () => {
    const links = ACCOUNTING_TABS.filter((i) => i.kind === "link");
    expect(links.map((i) => i.label)).toEqual([
      "Yevmiye",
      "Hesap Planı",
      "Mizan",
      "Banka Mutabakatı",
      "KDV Beyanı",
      "Dönem Kapanışı",
    ]);
    const disabled = ACCOUNTING_TABS.filter((i) => i.kind === "disabled");
    expect(disabled.map((i) => i.label)).toEqual(["e-Fatura"]);
  });
});

describe("🔴 devre dışı sekme GERÇEK bir gerekçe taşır", () => {
  it("gerekçe metni BİREBİR sabittir", () => {
    const disabled = ACCOUNTING_TABS.filter((i) => i.kind === "disabled");
    // 🔴 Boş küme üzerinde dönen bir `for` HİÇBİR ŞEY kanıtlamaz — öğenin
    // gerçekten var olduğu ÖNCE ölçülür (F-MU2'de dört öğeden ikisi düştü;
    // sayı denetimi olmasa iddia sessizce körelirdi).
    expect(disabled).toHaveLength(1);
    expect(disabled[0]?.kind === "disabled" && disabled[0].reason).toBe(
      "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı).",
    );
  });

  it("hiçbir gerekçe İÇİ BOŞ bir cümle değildir", () => {
    // "bu ekran henüz açılmadı" gibi bilgi taşımayan metinler YASAK: gerekçe
    // hangi dilimde/hangi kararla geleceğini söylemek zorundadır.
    const disabled = ACCOUNTING_TABS.filter((i) => i.kind === "disabled");
    expect(disabled).toHaveLength(1);
    for (const item of disabled) {
      if (item.kind !== "disabled") continue;
      expect(item.reason.length).toBeGreaterThan(20);
      expect(item.reason).toMatch(/backend|ertelendi/);
    }
  });

  it("gerekçe EKRANA basılacak biçimde etiketiyle birlikte üretilir", () => {
    // Şerit dar olduğu için gerekçe hap'ın altında değil şeridin altında
    // basılır; bu yüzden HANGİ sekmeye ait olduğu metnin İÇİNDE olmalıdır.
    expect(disabledTabReasons()).toEqual([
      "e-Fatura: e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı).",
    ]);
  });
});

describe("🔴 çift aktiflik bekçisi (F-SD T7 dersi)", () => {
  it("`/muhasebe` kök sekmesi EXACT'tir", () => {
    const root = ACCOUNTING_TABS.find((i) => i.label === "Yevmiye");
    expect(root).toMatchObject({ kind: "link", href: "/muhasebe", exact: true });
  });

  // Kök `exact: true` olduğu için alt yollar onu YAKMAZ; bunu HER alt yol
  // için ayrı ayrı iddia etmek testin işidir.
  it.each([
    ["/muhasebe", "Yevmiye"],
    ["/muhasebe/hesap-plani", "Hesap Planı"],
    ["/muhasebe/mizan", "Mizan"],
    ["/muhasebe/banka-mutabakati", "Banka Mutabakatı"],
    ["/muhasebe/kdv-beyani", "KDV Beyanı"],
    ["/muhasebe/donem-kapanisi", "Dönem Kapanışı"],
  ])("`%s` yolunda TEK bir sekme aktiftir", (pathname, label) => {
    expect(activeAccountingNavLabels(pathname)).toEqual([label]);
  });

  it("muhasebe DIŞINDAKİ bir yolda HİÇBİR sekme aktif değildir", () => {
    // Kardeş modüller (Hazine · Mali Tablolar) artık bu şeritte DEĞİL, kabuk
    // nav'ındadır — şerit onların yolunda tümüyle sönük kalmalıdır.
    expect(activeAccountingNavLabels("/hazine")).toEqual([]);
    expect(activeAccountingNavLabels("/mali-tablolar")).toEqual([]);
  });

  it("devre dışı sekme HİÇBİR yolda aktif olamaz", () => {
    for (const item of ACCOUNTING_TABS) {
      if (item.kind !== "disabled") continue;
      expect(isAccountingNavItemActive("/muhasebe", item)).toBe(false);
    }
  });
});

describe("kırık link koruması", () => {
  const ROUTE_TREE = buildRouteTree();

  // 🔴 5 → 6. Bir sekme LİNK'e çevrilip rotası açılmazsa catch-all
  // ComingSoon'a düşer ve kullanıcı "açıldı" sanılan boş bir ekran görür.
  // `banka-mutabakati` tam bu turda LİNK'e döndüğü için bu bekçi F-MUP'un
  // en kritik iddiasıdır.
  it("ALTI AÇIK sekme de GERÇEK statik rotadır (catch-all DEĞİL)", () => {
    for (const item of ACCOUNTING_TABS) {
      if (item.kind !== "link") continue;
      expect(resolveHrefIn(ROUTE_TREE, item.href, false), item.href).toEqual({
        kind: "static",
      });
    }
  });
});

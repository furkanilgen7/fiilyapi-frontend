import { describe, it, expect } from "vitest";
import { buildProjectNav } from "./project-nav-config";
import { buildRouteTree, COMING_SOON_PARENT_HREFS, resolveHrefIn } from "../route-tree.testkit";

describe("buildProjectNav — geri hedefi (spec §3.1)", () => {
  it("şantiye seçili değilken (Proje Detay) geri linki /projeler'e gider, etiket 'Projeler'", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    expect(nav.backLabel).toBe("Projeler");
    expect(nav.backHref).toBe("/projeler");
  });

  it("şantiye seçiliyken (Şantiye Detay) geri linki projeye gider, etiket proje adı", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    expect(nav.backLabel).toBe("Güneşkent Konut");
    expect(nav.backHref).toBe("/projeler/1");
  });
});

describe("buildProjectNav — bağlam bloğu", () => {
  it("her zaman 'Tüm Projeler' ve aktif proje öğesini içerir", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const contextGroup = nav.groups[0];
    expect(contextGroup.items.map((i) => i.label)).toEqual(["Tüm Projeler", "Güneşkent Konut"]);
    expect(contextGroup.items[0].href).toBe("/projeler");
    expect(contextGroup.items[1].href).toBe("/projeler/1");
  });

  // KOD INCELEME BULGUSU: ikisi de daha derin rotaların atasıdır; `exact`
  // olmadan ön ek eşleşmesi üçünü birden aktif işaretliyordu.
  it("bağlam bloğunun iki öğesi de exact (tam eşleşme) işaretlidir", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    expect(nav.groups[0].items.map((i) => i.exact)).toEqual([true, true]);
  });

  // F-SD T7: kural KÖK OLMAYAN 6 sekme içindir. "Bölümler" şantiye kök
  // rotasıdır ve diğerlerinin atasıdır; o `exact` taşır (aşağıdaki teste bkz.),
  // yoksa her alt sekmede iki öğe birden aktif görünür.
  it("kök olmayan şantiye sekmeleri exact DEĞİLDİR (alt rotalar ön ekle aktif kalır)", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    const leafTabs = siteGroup!.items.filter((i) => i.label !== "Bölümler");
    expect(leafTabs).toHaveLength(6);
    expect(leafTabs.every((i) => i.exact !== true)).toBe(true);
  });

  it("aktif şantiye yokken şantiyenin 6 sekmesi görünmez", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const allLabels = nav.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(allLabels).not.toContain("Bölümler");
    expect(allLabels).not.toContain("Günlük Kayıt");
  });

  // Onaylı sapma B (spec §2.2, §13): drill sidebar ile sekme barı ayrışmamalı —
  // "İş Kalemleri" ikisinde de Bölümler'den hemen sonra gelir.
  it("aktif şantiye grubunda İş Kalemleri öğesi var ve sekme barıyla aynı sırada", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    expect(siteGroup?.items[1].label).toBe("İş Kalemleri");
    expect(siteGroup?.items[1].href).toBe("/projeler/1/santiyeler/9/is-kalemleri");
  });

  it("aktif şantiye varken onun 7 sekmesi görünür ve doğru rotalara gider", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    expect(siteGroup).toBeDefined();
    expect(siteGroup?.items).toHaveLength(7);
    expect(siteGroup?.items.map((i) => i.label)).toEqual([
      "Bölümler",
      "İş Kalemleri",
      "Puantaj",
      "Stok",
      "Hakedişler",
      "Günlük Kayıt",
      "Belgeler",
    ]);
    expect(siteGroup?.items[0].href).toBe("/projeler/1/santiyeler/9");
    expect(siteGroup?.items[2].href).toBe("/projeler/1/santiyeler/9/puantaj");
  });
});

describe("buildProjectNav — Saha & İK / Stok & Satınalma / Mali grupları (spec §3.3)", () => {
  const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });

  it("Saha & İK grubunda 4 öğe içerir", () => {
    const group = nav.groups.find((g) => g.heading === "SAHA & İK");
    expect(group?.items.map((i) => i.label)).toEqual(["Puantaj", "Personel", "Makine & Ekipman", "Bordro"]);
  });

  it("Stok & Satınalma grubunda 2 öğe içerir", () => {
    const group = nav.groups.find((g) => g.heading === "STOK & SATINALMA");
    expect(group?.items.map((i) => i.label)).toEqual(["Stok & Depo", "Satınalma"]);
  });

  // F-P8 T2: "Satış Yönetimi" eklendi (SY 40 — mockup proje menüsünde çizer).
  it("Mali grubunda 7 öğe içerir", () => {
    const group = nav.groups.find((g) => g.heading === "MALİ");
    expect(group?.items.map((i) => i.label)).toEqual([
      "Sözleşmeler",
      "Satış Yönetimi",
      "Taşeron Hakediş",
      "İşveren Hakediş",
      "Muhasebe",
      "Hazine",
      "Mali Tablolar",
    ]);
  });

  it("her öğenin emoji alanı boş değildir", () => {
    for (const group of nav.groups) {
      for (const item of group.items) {
        expect(item.emoji.length).toBeGreaterThan(0);
      }
    }
  });
});

// Kırık link koruması: `src/app/(app)/` dosya sistemindeki GERÇEK rotalarla
// (elle yazılmış bir liste DEĞİL) drill nav'ın ürettiği her href'i karşılaştırır.
//
// Vaka: "İşveren Hakediş" → "/hakedisler/isveren" hardcode edilmişti. Böyle bir
// statik rota yok; `/hakedisler/[paymentId]/page.tsx` dinamik rotası "isveren"i
// bir hakediş ID'si sanıp yutuyordu → kullanıcı bulunamadı ekranı görüyordu.
//
// Kural: statik (sabit metin) href'ler yalnızca gerçek bir literal rotaya ya da
// (dinamik kardeş klasör YOKSA) [...slug] catch-all'a düşebilir. Bir href'in
// TEK eşleşme yolu dinamik bir segment klasörüyse (ör. [paymentId]) bu GEÇERSİZ
// sayılır — dinamik segmentler statik href parçalarını yutamaz. `buildProjectNav`
// ctx.projectId / ctx.siteId gibi GERÇEK değerlerle ürettiği href'ler için
// (ör. "/projeler/1/santiyeler/9") dinamik eşleşme beklenen davranıştır; bu
// href'ler ayrıca ve açıkça izinli olarak kontrol edilir.
describe("buildProjectNav — href geçerliliği (kırık link koruması)", () => {
  // Ağaç yürüyüşü + çözümleme `route-tree.testkit.ts`te (kabuk nav'ı da AYNI
  // korumayı kullanır — kural tek yerde durur).
  const ROUTE_TREE = buildRouteTree();

  function resolveHref(href: string, allowDynamicFallback: boolean) {
    return resolveHrefIn(ROUTE_TREE, href, allowDynamicFallback);
  }

  // Bilinen istisna kümesi ortak yardımcıdadır (route-tree.testkit.ts).

  function expectValidHref(label: string, href: string, allowDynamicFallback: boolean): void {
    if (COMING_SOON_PARENT_HREFS.has(href)) return;
    const result = resolveHref(href, allowDynamicFallback);
    if (result.kind === "dynamic-fallback") {
      throw new Error(
        `Nav öğesi "${label}" (href="${href}") geçersiz: yalnız ${result.matchedPrefix}${result.dynamicSegmentName} ` +
          `dinamik rotasına eşleşiyor (sabit href parçası dinamik segment tarafından yutuluyor). ` +
          `Gerçek bir statik rota veya catch-all hedefi olmalı.`,
      );
    }
    if (result.kind === "not-found") {
      throw new Error(`Nav öğesi "${label}" (href="${href}") geçersiz: eşleşen bir sayfa (page.tsx) yok.`);
    }
    expect(result.kind === "static" || result.kind === "catch-all").toBe(true);
  }

  // Ön koşul: route ağacı gerçekten okunabiliyor mu? (testin kendisinin
  // sessizce no-op'a düşmediğini garantiler)
  it("route ağacı src/app/(app) altından okunur (sağlık kontrolü)", () => {
    expect(ROUTE_TREE.literalChildren.has("hakedisler")).toBe(true);
    expect(ROUTE_TREE.literalChildren.get("hakedisler")?.dynamicChild?.name).toBe("[paymentId]");
  });

  it("dinamik segment statik href parçasını yutuyorsa GEÇERSİZ sayılır (regresyon: /hakedisler/isveren)", () => {
    const result = resolveHref("/hakedisler/isveren", false);
    expect(result).toEqual({ kind: "dynamic-fallback", dynamicSegmentName: "[paymentId]", matchedPrefix: "/hakedisler" });
  });

  it("PROJELER, SAHA & İK, STOK & SATINALMA, MALİ gruplarındaki tüm statik href'ler geçerli bir rotaya düşer", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const staticGroupHeadings = ["PROJELER", "SAHA & İK", "STOK & SATINALMA", "MALİ"];
    for (const group of nav.groups.filter((g) => staticGroupHeadings.includes(g.heading))) {
      for (const item of group.items) {
        // "PROJELER" grubundaki aktif proje öğesi ctx.projectId ile üretilir
        // (gerçek ID → dinamik eşleşme beklenir); diğerleri sabit metin href'lerdir.
        const allowDynamicFallback = group.heading === "PROJELER";
        expectValidHref(item.label, item.href, allowDynamicFallback);
      }
    }
  });

  it("aktif şantiyenin 7 sekmesi (gerçek projectId/siteId ile üretilmiş) geçerli bir rotaya düşer", () => {
    const nav = buildProjectNav({
      projectId: "42",
      projectName: "Güneşkent Konut",
      siteId: "99",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    expect(siteGroup).toBeDefined();
    for (const item of siteGroup!.items) {
      // Bu href'ler ctx.projectId/ctx.siteId gibi gerçek değerlerle
      // üretildiği için dinamik segmentlere düşmesi beklenen davranıştır.
      expectValidHref(item.label, item.href, true);
    }
  });

  // F-BC T2: "Belgeler" artık GERÇEK bir rotadır — catch-all ComingSoon'a
  // düşmemelidir. Yukarıdaki döngü catch-all'ı da geçerli saydığından (henüz
  // yazılmamış sekmeler için doğru davranış) yazılmış sekme AYRICA sınanır:
  // rota klasörü silinir/yeniden adlandırılırsa bu test kırılır, kullanıcı
  // sessizce "yakında" ekranı görmez.
  it("'Belgeler' sekmesi gerçek bir statik rotaya düşer (catch-all DEĞİL)", () => {
    const nav = buildProjectNav({
      projectId: "42",
      projectName: "Güneşkent Konut",
      siteId: "99",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    const documents = siteGroup!.items.find((i) => i.label === "Belgeler");
    expect(documents?.href).toBe("/projeler/42/santiyeler/99/belgeler");
    expect(resolveHref(documents!.href, true)).toEqual({ kind: "static" });
  });

  // F-ST T3: bu sekme ARTIK yazıldı — daha önce catch-all ComingSoon'a düşen
  // tek şantiye sekmesiydi. Guard tersine çevrildi: gerçek rotaya çözülmezse
  // (rota silinir/yeniden adlandırılırsa) test kırmızıya döner.
  it("'Stok' sekmesi gerçek rotaya çözülür (ComingSoon DEĞİL)", () => {
    const nav = buildProjectNav({
      projectId: "42",
      projectName: "Güneşkent Konut",
      siteId: "99",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    const stock = siteGroup!.items.find((i) => i.label === "Stok");
    expect(stock?.href).toBe("/projeler/42/santiyeler/99/stok");
    expect(resolveHref(stock!.href, true)).toEqual({ kind: "static" });
  });

  // F-P8 T2: "Satış Yönetimi" GERÇEK bir rotadır (`/satis`). Yukarıdaki döngü
  // catch-all'ı da geçerli saydığından yazılmış öğe AYRICA sınanır: rota
  // klasörü silinirse test kırılır, kullanıcı sessizce "yakında" görmez.
  it("'Satış Yönetimi' /satis statik rotasına düşer (catch-all DEĞİL)", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const item = nav.groups
      .flatMap((g) => g.items)
      .find((i) => i.label === "Satış Yönetimi");
    expect(item?.href).toBe("/satis");
    expect(resolveHref(item!.href, false)).toEqual({ kind: "static" });
  });

  // F-SA T2: drill sidebar'daki "Satınalma" GERÇEK bir rotadır (`/satinalma`).
  // Öğe drill nav'a F3'ten beri kayıtlıydı — YENİ ÖĞE EKLENMEDİ, yalnız hedefi
  // ComingSoon'dan gerçek sayfaya döndü. Rota klasörü silinirse bu test kırılır.
  it("'Satınalma' /satinalma statik rotasına düşer (catch-all DEĞİL)", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const item = nav.groups.flatMap((g) => g.items).find((i) => i.label === "Satınalma");
    expect(item?.href).toBe("/satinalma");
    expect(resolveHref(item!.href, false)).toEqual({ kind: "static" });
  });

  // F-SD T7 final review bulgusu: "Bölümler" şantiye kök rotasıdır ve diğer 6
  // sekmenin atasıdır; `exact` olmadan ön ek eşleşmesi her alt sekmede İKİ
  // öğeyi birden aktif işaretliyordu (ekran görüntüsüyle yakalandı).
  it("şantiye kök sekmesi 'Bölümler' exact'tir — alt sekmelerde çift aktiflik olmaz", () => {
    const nav = buildProjectNav({
      projectId: "42",
      projectName: "Güneşkent Konut",
      siteId: "99",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    const sections = siteGroup!.items.find((i) => i.label === "Bölümler");
    expect(sections?.exact).toBe(true);

    // Alt sekmelerin hiçbiri exact DEĞİLDİR: "Günlük Kayıt" ön ek eşleşmesiyle
    // `.../gunluk-kayit/ozet` alt görünümünde de aktif kalmalıdır.
    const diary = siteGroup!.items.find((i) => i.label === "Günlük Kayıt");
    expect(diary?.exact).toBeUndefined();
    expect(diary?.href).toBe("/projeler/42/santiyeler/99/gunluk-kayit");
  });
});

import { describe, expect, it } from "vitest";
import { NAV_GROUPS, moduleNameForSlug } from "./nav-config";
import { buildRouteTree, COMING_SOON_PARENT_HREFS, resolveHrefIn } from "./route-tree.testkit";

describe("NAV_GROUPS", () => {
  it("4 grup icerir (canon)", () => {
    expect(NAV_GROUPS).toHaveLength(4);
    expect(NAV_GROUPS.map((g) => g.heading)).toEqual([
      "Genel",
      "Saha & İK",
      "Stok & Satınalma",
      "Sözleşme & Mali",
    ]);
  });
  it("her ogenin label, href ve Icon'u vardir", () => {
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        expect(item.label).toBeTruthy();
        expect(item.href.startsWith("/")).toBe(true);
        expect(typeof item.Icon).toBe("function");
      }
    }
  });
  it("hrefler benzersizdir", () => {
    const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("Gosterge Paneli / rotasina gider", () => {
    const dash = NAV_GROUPS[0].items[0];
    expect(dash.label).toBe("Gösterge Paneli");
    expect(dash.href).toBe("/");
  });
  it("sirket varliklari kalemi bordro ile belge arsivi arasindadir", () => {
    const mali = NAV_GROUPS.find((g) => g.heading === "Sözleşme & Mali");
    const labels = mali!.items.map((i) => i.label);
    expect(labels.indexOf("Şirket Varlıkları")).toBe(labels.indexOf("Bordro") + 1);
    expect(labels.indexOf("Belge Arşivi")).toBe(labels.indexOf("Şirket Varlıkları") + 1);
  });
});

describe("moduleNameForSlug", () => {
  it("bilinen slug'i modul adina cevirir", () => {
    expect(moduleNameForSlug("projeler")).toBe("Projeler");
    expect(moduleNameForSlug("mali-tablolar")).toBe("Mali Tablolar");
  });
  it("bilinmeyen slug'i baslik-case fallback yapar", () => {
    expect(moduleNameForSlug("bilinmeyen-modul")).toBe("Bilinmeyen Modul");
  });
});

// Kırık link koruması (F-TH dersi) — drill nav'la AYNI yardımcıyı kullanır:
// href'ler dosya sistemindeki GERÇEK rotalarla karşılaştırılır, elle yazılmış
// bir listeyle değil.
describe("NAV_GROUPS — href geçerliliği (kırık link koruması)", () => {
  const ROUTE_TREE = buildRouteTree();

  it("route ağacı okunur (sağlık kontrolü)", () => {
    expect(ROUTE_TREE.literalChildren.has("projeler")).toBe(true);
  });

  it("her nav href'i gerçek bir sayfaya ya da catch-all'a düşer (dinamik yutma YOK)", () => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (COMING_SOON_PARENT_HREFS.has(item.href)) continue;
        const result = resolveHrefIn(ROUTE_TREE, item.href, false);
        expect(
          result.kind === "static" || result.kind === "catch-all",
          `Nav öğesi "${item.label}" (href="${item.href}") geçersiz: ${JSON.stringify(result)}`,
        ).toBe(true);
      }
    }
  });

  // F-BC T4: "Belge Arşivi" artık GERÇEK bir rotadır. Yukarıdaki döngü
  // catch-all'ı da geçerli saydığından (henüz yazılmamış modüller için doğru
  // davranış) YAZILMIŞ öğe AYRICA sınanır: rota klasörü silinir/yeniden
  // adlandırılırsa bu test kırılır, kullanıcı sessizce "yakında" görmez.
  it("'Belge Arşivi' /belgeler statik rotasına düşer (catch-all DEĞİL)", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === "Belge Arşivi");
    expect(item?.href).toBe("/belgeler");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "static" });
  });

  // F-ST T2: "Stok & Depo" artık GERÇEK bir rotadır (`/stok`). Yukarıdaki
  // döngü catch-all'ı da geçerli saydığı için YAZILMIŞ öğe AYRICA sınanır:
  // rota klasörü silinir/yeniden adlandırılırsa bu test kırılır, kullanıcı
  // sessizce "yakında" görmez.
  it("'Stok & Depo' /stok statik rotasına düşer (catch-all DEĞİL)", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === "Stok & Depo");
    expect(item?.href).toBe("/stok");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "static" });
  });

  // F-P8 T2: "Satış Yönetimi" GERÇEK bir rotadır (`/satis`) — SY 40'taki
  // mockup öğesinin kabuk karşılığı. Catch-all'a düşerse kullanıcı sessizce
  // "yakında" ekranı görür; bu test onu kırmızıya çevirir.
  it("'Satış Yönetimi' /satis statik rotasına düşer (catch-all DEĞİL)", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === "Satış Yönetimi");
    expect(item?.href).toBe("/satis");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "static" });
  });

  // F-SA T2: "Satınalma & Teklif" GERÇEK bir rotadır (`/satinalma`). Nav'a
  // YENİ ÖĞE EKLENMEDİ — öğe (ve href'i) F3 kabuk canon'undan beri duruyordu,
  // yalnız hedefi ComingSoon'dan gerçek sayfaya döndü. Bu test o dönüşü
  // kilitler: rota klasörü silinirse kullanıcı sessizce "yakında" görmez.
  it("'Satınalma & Teklif' /satinalma statik rotasına düşer (catch-all DEĞİL)", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find(
      (i) => i.label === "Satınalma & Teklif",
    );
    expect(item?.href).toBe("/satinalma");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "static" });
  });

  // F-MU1 T2: `/muhasebe` GERÇEK sayfa oldu (E8 · Yevmiye Defteri) — bu satır
  // artık "henüz yazılmamış" kontrol grubu DEĞİL, `/satinalma` ile aynı
  // dönüşün kilididir: rota klasörü silinirse kullanıcı sessizce "yakında"
  // görmez.
  it("'Muhasebe' /muhasebe statik rotasına düşer (catch-all DEĞİL)", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === "Muhasebe");
    expect(item?.href).toBe("/muhasebe");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "static" });
  });

  // 🔴 KONTROL GRUBU (F-MU1 T3'te YENİDEN kuruldu). Yukarıdaki beş iddia
  // "yazılmış öğe gerçekten statik rotaya düşüyor mu" diye sorar; hepsi
  // `resolveHrefIn`in POZİTİF yolunu sınar. T2'de `/muhasebe` gerçek sayfaya
  // dönünce dosyada hiç NEGATİF örnek kalmamıştı — `resolveHrefIn` her şeye
  // `{kind:"static"}` döndürecek şekilde bozulsaydı testlerin TAMAMI yeşil
  // kalırdı. "Mali Tablolar" bugün yazılmamış tek nav öğesidir ve gerçekten
  // catch-all'a düşer; yazıldığı gün bu test kırmızıya döner ve ONU da
  // yukarıdaki listeye taşımak gerekir (kasıtlı bakım noktası).
  it("kontrol grubu: 'Mali Tablolar' HENÜZ yazılmamıştır → catch-all'a düşer", () => {
    const item = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.label === "Mali Tablolar");
    expect(item?.href).toBe("/mali-tablolar");
    expect(resolveHrefIn(ROUTE_TREE, item!.href, false)).toEqual({ kind: "catch-all" });
  });
});

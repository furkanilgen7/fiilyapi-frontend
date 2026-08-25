import { describe, it, expect } from "vitest";
import {
  buildRouteTree,
  COMING_SOON_PARENT_HREFS,
  resolveHrefIn,
} from "@/components/shell/route-tree.testkit";
import { SETTINGS_NAV, settingsLabelForPath } from "./settings-nav-config";

describe("SETTINGS_NAV", () => {
  it("3 grup ve 10 öğe içerir", () => {
    expect(SETTINGS_NAV.map((g) => g.heading)).toEqual(["GENEL", "KULLANICI & ERİŞİM", "SİSTEM"]);
    expect(SETTINGS_NAV.flatMap((g) => g.items)).toHaveLength(10);
  });
  // F-OKROL — mockup `:82` "Onay Rolleri ve Eşik"i İzin Matrisi'nin HEMEN
  // ARDINA koyar. Sıra kayarsa ekran erişilebilir kalır ama mockup'ın
  // çizdiği yerde durmaz.
  it("Onay Rolleri ve Eşik, İzin Matrisi'nin hemen ardındadır", () => {
    const grup = SETTINGS_NAV.find((g) => g.heading === "KULLANICI & ERİŞİM");
    const labels = grup!.items.map((i) => i.label);
    expect(labels.indexOf("Onay Rolleri ve Eşik")).toBe(labels.indexOf("İzin Matrisi") + 1);
  });
  it("hrefler benzersizdir", () => {
    const hrefs = SETTINGS_NAV.flatMap((g) => g.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
  it("her href /ayarlar ile başlar", () => {
    for (const item of SETTINGS_NAV.flatMap((g) => g.items)) {
      expect(item.href.startsWith("/ayarlar/")).toBe(true);
    }
  });
});

describe("settingsLabelForPath", () => {
  it("izin-matrisi için 'İzin Matrisi' döner", () => {
    expect(settingsLabelForPath("/ayarlar/izin-matrisi")).toBe("İzin Matrisi");
  });
  it("bilinmeyen yol için 'Ayarlar' döner", () => {
    expect(settingsLabelForPath("/ayarlar/__yok__")).toBe("Ayarlar");
  });
});

/**
 * 🔴 KIRIK LİNK KORUMASI — F-PRJTAB kanonu: "kullanıcıyı bir rotaya gönderen
 * HER yüzey bekçiye kaydedilir". Ayarlar kenar çubuğu bugüne kadar
 * `route-tree.testkit`e KAYITLI DEĞİLDİ (ölçüldü: `grep -rl route-tree.testkit
 * src` → 6 dosya, hiçbiri Ayarlar değil). *Araç varlığı koruma değildir;
 * koruma, yüzeyin araca KAYDEDİLMESİDİR.*
 */
describe("SETTINGS_NAV — href geçerliliği (kırık link koruması)", () => {
  const ROUTE_TREE = buildRouteTree();

  it("route ağacı okunur (sağlık kontrolü)", () => {
    expect(ROUTE_TREE.literalChildren.has("ayarlar")).toBe(true);
  });

  it("her ayarlar nav href'i gerçek bir sayfaya düşer (dinamik yutma YOK)", () => {
    for (const group of SETTINGS_NAV) {
      for (const item of group.items) {
        if (COMING_SOON_PARENT_HREFS.has(item.href)) continue;
        const result = resolveHrefIn(ROUTE_TREE, item.href, false);
        expect(
          result.kind === "static",
          `Ayarlar nav öğesi "${item.label}" (href="${item.href}") geçersiz: ${JSON.stringify(result)}`,
        ).toBe(true);
      }
    }
  });
});

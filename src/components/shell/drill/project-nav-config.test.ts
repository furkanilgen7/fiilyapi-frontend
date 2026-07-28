import { describe, it, expect } from "vitest";
import { buildProjectNav } from "./project-nav-config";

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

  it("aktif şantiye yokken şantiyenin 6 sekmesi görünmez", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    const allLabels = nav.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(allLabels).not.toContain("Bölümler");
    expect(allLabels).not.toContain("Günlük Kayıt");
  });

  it("aktif şantiye varken onun 6 sekmesi görünür ve doğru rotalara gider", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    expect(siteGroup).toBeDefined();
    expect(siteGroup?.items).toHaveLength(6);
    expect(siteGroup?.items.map((i) => i.label)).toEqual([
      "Bölümler",
      "Puantaj",
      "Stok",
      "Hakedişler",
      "Günlük Kayıt",
      "Belgeler",
    ]);
    expect(siteGroup?.items[0].href).toBe("/projeler/1/santiyeler/9");
    expect(siteGroup?.items[1].href).toBe("/projeler/1/santiyeler/9/puantaj");
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

  it("Mali grubunda 6 öğe içerir", () => {
    const group = nav.groups.find((g) => g.heading === "MALİ");
    expect(group?.items.map((i) => i.label)).toEqual([
      "Sözleşmeler",
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

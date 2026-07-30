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

  // KOD INCELEME BULGUSU: ikisi de daha derin rotaların atasıdır; `exact`
  // olmadan ön ek eşleşmesi üçünü birden aktif işaretliyordu.
  it("bağlam bloğunun iki öğesi de exact (tam eşleşme) işaretlidir", () => {
    const nav = buildProjectNav({ projectId: "1", projectName: "Güneşkent Konut" });
    expect(nav.groups[0].items.map((i) => i.exact)).toEqual([true, true]);
  });

  it("şantiye sekmeleri exact DEĞİLDİR (alt rotalar ön ekle aktif kalır)", () => {
    const nav = buildProjectNav({
      projectId: "1",
      projectName: "Güneşkent Konut",
      siteId: "9",
      siteName: "A-Blok Şantiyesi",
    });
    const siteGroup = nav.groups.find((g) => g.heading === "A-Blok Şantiyesi");
    expect(siteGroup?.items.every((i) => i.exact !== true)).toBe(true);
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

import { describe, expect, it } from "vitest";
import { NAV_GROUPS, moduleNameForSlug } from "./nav-config";

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

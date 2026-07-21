import { describe, it, expect } from "vitest";
import { SETTINGS_NAV, settingsLabelForPath } from "./settings-nav-config";

describe("SETTINGS_NAV", () => {
  it("3 grup ve 9 öğe içerir", () => {
    expect(SETTINGS_NAV.map((g) => g.heading)).toEqual(["GENEL", "KULLANICI & ERİŞİM", "SİSTEM"]);
    expect(SETTINGS_NAV.flatMap((g) => g.items)).toHaveLength(9);
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

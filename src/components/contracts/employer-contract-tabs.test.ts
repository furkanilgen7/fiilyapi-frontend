import { describe, it, expect } from "vitest";

import {
  DEFAULT_EMPLOYER_CONTRACT_TAB,
  EMPLOYER_CONTRACT_TABS,
  employerContractDistributionHref,
  employerContractHref,
  employerContractTabHref,
  parseEmployerContractTab,
} from "./employer-contract-tabs";

describe("employer-contract-tabs · E14 sekme durumu URL'de", () => {
  it("sekme sırası ve etiketleri mockup 91-94 ile birebirdir", () => {
    expect(EMPLOYER_CONTRACT_TABS.map((tab) => tab.label)).toEqual([
      "Genel",
      "İş Kalemleri",
      "Hakedişler",
      "Belgeler",
    ]);
  });

  it("parametresiz URL 'Genel' sekmesini verir (mockup 91 seçili başlar)", () => {
    expect(parseEmployerContractTab(new URLSearchParams())).toBe("general");
    expect(DEFAULT_EMPLOYER_CONTRACT_TAB).toBe("general");
  });

  it("null arama parametresinde de varsayılana düşer", () => {
    expect(parseEmployerContractTab(null)).toBe("general");
  });

  it("dört geçerli değeri de tanır", () => {
    for (const tab of EMPLOYER_CONTRACT_TABS) {
      expect(parseEmployerContractTab(new URLSearchParams(`tab=${tab.value}`))).toBe(
        tab.value,
      );
    }
  });

  it("tanınmayan değer varsayılana düşer (URL kurcalamasına dayanıklı)", () => {
    expect(parseEmployerContractTab(new URLSearchParams("tab=hepsi"))).toBe("general");
  });

  it("varsayılan sekmenin href'i parametresizdir, diğerleri parametrelidir", () => {
    expect(employerContractTabHref("p-1", "general")).toBe("/sozlesmeler/isveren/p-1");
    expect(employerContractTabHref("p-1", "items")).toBe(
      "/sozlesmeler/isveren/p-1?tab=items",
    );
    expect(employerContractTabHref("p-1", "payments")).toBe(
      "/sozlesmeler/isveren/p-1?tab=payments",
    );
    expect(employerContractTabHref("p-1", "documents")).toBe(
      "/sozlesmeler/isveren/p-1?tab=documents",
    );
  });

  it("temel rota SZL satırının 'Detay →' hedefiyle aynıdır", () => {
    expect(employerContractHref("p-1")).toBe("/sozlesmeler/isveren/p-1");
  });

  // 🔴 F-PRJKALEM bekcisi: kimlik URL'e KODLANARAK yazilir. Kurucudan
  // `encodeURIComponent` dusurulurse bosluk/`&` tasiyan bir kimlik rotayi
  // bozar (query'ye sizar) — bugunku UUID cagiranlar bunu hic gostermez.
  it("proje kimligi URL'e kodlanir (uc kurucunun UCU DE)", () => {
    expect(employerContractHref("a b&c")).toBe("/sozlesmeler/isveren/a%20b%26c");
    expect(employerContractTabHref("a b&c", "items")).toBe(
      "/sozlesmeler/isveren/a%20b%26c?tab=items",
    );
    expect(employerContractDistributionHref("a b&c")).toBe(
      "/sozlesmeler/isveren/a%20b%26c/poz-dagilimi",
    );
  });

  it("POZ ekranı rotası spec §1 tablosuyla birebirdir", () => {
    expect(employerContractDistributionHref("p-1")).toBe(
      "/sozlesmeler/isveren/p-1/poz-dagilimi",
    );
  });
});

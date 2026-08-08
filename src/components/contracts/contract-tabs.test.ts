import { describe, it, expect } from "vitest";

import { contractTabHref, parseContractTab } from "./contract-tabs";

describe("parseContractTab", () => {
  it("parametresiz URL varsayılan İşveren sekmesidir (mockup 27)", () => {
    expect(parseContractTab(new URLSearchParams())).toBe("employer");
  });

  it("`type=subcontractor` taşeron sekmesini seçer", () => {
    expect(parseContractTab(new URLSearchParams("type=subcontractor"))).toBe("subcontractor");
  });

  it("tanınmayan değer varsayılana düşer — 422 üreten bir istek atılmaz", () => {
    expect(parseContractTab(new URLSearchParams("type=hepsi"))).toBe("employer");
    expect(parseContractTab(new URLSearchParams("type="))).toBe("employer");
    expect(parseContractTab(null)).toBe("employer");
  });
});

describe("contractTabHref", () => {
  it("varsayılan sekmenin href'i parametresizdir (nav linkiyle aynı)", () => {
    expect(contractTabHref("employer")).toBe("/sozlesmeler");
  });

  it("taşeron sekmesi paylaşılabilir bir URL üretir", () => {
    expect(contractTabHref("subcontractor")).toBe("/sozlesmeler?type=subcontractor");
  });

  it("href → parse gidiş-dönüşü kararlıdır", () => {
    for (const tab of ["employer", "subcontractor"] as const) {
      const query = contractTabHref(tab).split("?")[1] ?? "";
      expect(parseContractTab(new URLSearchParams(query))).toBe(tab);
    }
  });
});

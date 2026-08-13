import { describe, it, expect } from "vitest";

import { EMPTY_PERSONNEL_HR_FIELDS } from "@/lib/api/hooks/personnel-fixtures";

import {
  deriveKpis,
  deriveTradeOptions,
  filterByTrade,
  paginateClientSide,
  type PersonnelDeriveItem,
} from "./personnel-derive";

// F-PT2 T1 · K-F — saf turev modulu (React yok, mutasyon yok). Sef karari:
// backend `trade` suzgeci/derivesi VERMEZ (spec K-B), bu yuzden meslek
// secenekleri + suzme + KPI kirpilma bayragi burada, TEST EDILEBILIR sekilde
// yasar. `usePersonnel` deseninin aksine burada AG cagrisi YOK.

function item(overrides: Partial<PersonnelDeriveItem> = {}): PersonnelDeriveItem {
  return {
    ...EMPTY_PERSONNEL_HR_FIELDS,
    id: "per-1",
    full_name: "Mehmet Kılıç",
    trade: "Kalıpçı",
    source: "company",
    subcontractor_id: null,
    user_id: null,
    is_active: true,
    ...overrides,
  };
}

describe("deriveKpis", () => {
  it("kirpilma YOKSA (total === items.length) sirket/taseron sayilari TUREV olarak dolar", () => {
    const items = [
      item({ id: "1", source: "company" }),
      item({ id: "2", source: "company" }),
      item({ id: "3", source: "subcontractor" }),
      item({ id: "4", source: "general" }),
    ];

    const kpis = deriveKpis(items, 4);

    expect(kpis).toEqual({
      total: 4,
      isClipped: false,
      companyCount: 2,
      subcontractorCount: 1,
    });
  });

  it("kirpilma VARSA (total > items.length) sirket/taseron sayilari pending'e duser", () => {
    const items = [item({ id: "1", source: "company" }), item({ id: "2", source: "company" })];

    const kpis = deriveKpis(items, 87);

    expect(kpis).toEqual({
      total: 87,
      isClipped: true,
      companyCount: null,
      subcontractorCount: null,
    });
  });

  it("toplam HER ZAMAN sunucunun total'idir — kirpilmada bile GERCEK kalir", () => {
    const kpis = deriveKpis([item()], 200);
    expect(kpis.total).toBe(200);
  });
});

describe("deriveTradeOptions", () => {
  it("ayrik meslek degerlerini alfabetik (tr) siralar", () => {
    const items = [
      item({ id: "1", trade: "Sıvacı" }),
      item({ id: "2", trade: "Elektrikçi" }),
      item({ id: "3", trade: "Sıvacı" }),
      item({ id: "4", trade: "Çilingir" }),
    ];

    expect(deriveTradeOptions(items)).toEqual(["Çilingir", "Elektrikçi", "Sıvacı"]);
  });

  it("bos/null meslek degerlerini disleyerek uretir", () => {
    const items = [
      item({ id: "1", trade: null }),
      item({ id: "2", trade: "Kalıpçı" }),
      item({ id: "3", trade: "" }),
    ];

    expect(deriveTradeOptions(items)).toEqual(["Kalıpçı"]);
  });

  it("bos liste ile bos dizi doner", () => {
    expect(deriveTradeOptions([])).toEqual([]);
  });
});

describe("filterByTrade", () => {
  it("secili meslege UYMAYANLARI eler", () => {
    const items = [
      item({ id: "1", trade: "Kalıpçı" }),
      item({ id: "2", trade: "Sıvacı" }),
      item({ id: "3", trade: "Kalıpçı" }),
    ];

    expect(filterByTrade(items, "Kalıpçı").map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("meslek verilmezse (tumu) hicbir kayit elenmez", () => {
    const items = [item({ id: "1" }), item({ id: "2" })];
    expect(filterByTrade(items, undefined)).toEqual(items);
  });

  it("girdi dizisini MUTASYONA UGRATMAZ (immutable)", () => {
    const items = [item({ id: "1", trade: "Kalıpçı" }), item({ id: "2", trade: "Sıvacı" })];
    const original = [...items];
    filterByTrade(items, "Kalıpçı");
    expect(items).toEqual(original);
  });
});

describe("paginateClientSide", () => {
  const items = Array.from({ length: 25 }, (_, i) => item({ id: `p-${i}` }));

  it("verilen sayfa/boyut kadar dilim doner", () => {
    const page = paginateClientSide(items, 1, 10);
    expect(page.pageItems).toHaveLength(10);
    expect(page.pageItems[0].id).toBe("p-0");
    expect(page.totalPages).toBe(3);
  });

  it("son sayfada eksik kayitla kalan kismi doner", () => {
    const page = paginateClientSide(items, 3, 10);
    expect(page.pageItems).toHaveLength(5);
    expect(page.pageItems[0].id).toBe("p-20");
  });

  it("bos listede tek (bos) sayfa doner", () => {
    const page = paginateClientSide([], 1, 10);
    expect(page.pageItems).toEqual([]);
    expect(page.totalPages).toBe(1);
  });
});

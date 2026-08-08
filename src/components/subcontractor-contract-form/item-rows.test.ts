import { describe, it, expect } from "vitest";

import type { SubcontractorContractItemResponse } from "@/lib/api/hooks/useSubcontractorContractMutations";

import { decimalInputValue, groupContractItems } from "./item-rows";

function item(
  id: string,
  group: { id: string; name: string } | null,
): SubcontractorContractItemResponse {
  return {
    id,
    contract_id: "sc-1",
    source_contract_item_id: null,
    code: id,
    description: id,
    unit: "m³",
    quantity: "1.000",
    unit_price: null,
    sort_order: 0,
    group,
    line_total: "0.00",
  };
}

const A = { id: "g-a", name: "A — Betonarme İşleri" };
const B = { id: "g-b", name: "B — Kalıp İşleri" };

describe("groupContractItems", () => {
  it("kalemleri geliş sırasına göre gruplar (132 · 160)", () => {
    const groups = groupContractItems([item("1", A), item("2", A), item("3", B)]);
    expect(groups.map((g) => g.name)).toEqual([A.name, B.name]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it("grupsuz kalemler başlıksız kümede toplanır — satır GİZLENMEZ", () => {
    const groups = groupContractItems([item("1", null), item("2", A), item("3", null)]);
    expect(groups.map((g) => g.name)).toEqual([null, A.name]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("boş listede grup üretmez", () => {
    expect(groupContractItems([])).toEqual([]);
  });
});

describe("decimalInputValue", () => {
  it("backend'in sondaki sıfırlarını atar", () => {
    expect(decimalInputValue("1200.000")).toBe("1200");
    expect(decimalInputValue("85.500")).toBe("85.5");
  });

  it("tam sayıya dokunmaz, `null` boş string olur", () => {
    expect(decimalInputValue("340")).toBe("340");
    expect(decimalInputValue(null)).toBe("");
  });
});

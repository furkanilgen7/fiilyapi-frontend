import { describe, it, expect } from "vitest";

import { boqTreeItems, siteTreeSections } from "./diary-tree-sources";

describe("diary-tree-sources", () => {
  it("BOQ kalemleri grup → kalem sort_order sırasıyla düzleşir", () => {
    const boq = {
      groups: [
        { id: "g2", sort_order: 2, items: [{ id: "c", code: "C", description: "c", unit: "m", unit_price: "1", unallocated_quantity: "0", sort_order: 1 }] },
        {
          id: "g1",
          sort_order: 1,
          items: [
            { id: "b", code: "B", description: "b", unit: "m", unit_price: null, unallocated_quantity: null, sort_order: 2 },
            { id: "a", code: "A", description: "a", unit: "m", unit_price: "2", unallocated_quantity: "5", sort_order: 1 },
          ],
        },
      ],
    } as never;

    expect(boqTreeItems(boq).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(boqTreeItems(undefined)).toEqual([]);
  });

  it("bölümler id/ad/kod/sıra taşır", () => {
    expect(siteTreeSections([{ id: "s", name: "Kat 1–5", code: "K15", sort_order: 2 }] as never)).toEqual([
      { id: "s", name: "Kat 1–5", code: "K15", sort_order: 2 },
    ]);
  });
});

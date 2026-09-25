import { describe, expect, it } from "vitest";

import type { EvBudgetView, EvRevisionOut } from "@/lib/api/models";

import { activeRevisionId, buildItemFacts } from "./item-meta";
import { ITEM_BETON, ITEM_KALIP, ITEM_PRIZ } from "./diary-fixtures";

type ItemOut = EvBudgetView["disciplines"][number]["groups"][number]["items"][number];

function item(itemId: string, isDirect: boolean, contractor: "own" | "subcon"): ItemOut {
  return { item_id: itemId, is_direct: isDirect, contractor_type: contractor } as ItemOut;
}

function budget(items: ItemOut[]): EvBudgetView {
  return { disciplines: [{ groups: [{ items: items.slice(0, 2) }, { items: items.slice(2) }] }] } as unknown as EvBudgetView;
}

describe("activeRevisionId — dağıtım AKTİF (dondurulmuş) baseline'a bakar", () => {
  it("aktif revizyonu seçer; yoksa null (taslak varsayılanına DÜŞMEZ)", () => {
    const revs = [{ id: "r2", status: "draft" }, { id: "r1", status: "active" }] as EvRevisionOut[];
    expect(activeRevisionId(revs)).toBe("r1");
    expect(activeRevisionId([{ id: "r2", status: "draft" }] as EvRevisionOut[])).toBeNull();
    expect(activeRevisionId(undefined)).toBeNull();
  });
});

describe("buildItemFacts — G9 dolaylı kalemler + İ:225 Kendi/Taşeron", () => {
  it("is_direct=false kalemler dolaylı kümesinde; etiket contractor_type'tan", () => {
    const facts = buildItemFacts(budget([item(ITEM_KALIP, true, "own"), item(ITEM_BETON, true, "subcon"), item(ITEM_PRIZ, false, "own")]));
    expect([...facts.indirectItemIds]).toEqual([ITEM_PRIZ]);
    expect(facts.contractorLabel(ITEM_KALIP)).toBe("Kendi");
    expect(facts.contractorLabel(ITEM_BETON)).toBe("Taşeron");
    expect(facts.contractorLabel("yok")).toBeNull();
  });

  it("bütçe gelmediyse boş küme, etiket yok", () => {
    const facts = buildItemFacts(undefined);
    expect(facts.indirectItemIds.size).toBe(0);
    expect(facts.contractorLabel(ITEM_KALIP)).toBeNull();
  });
});

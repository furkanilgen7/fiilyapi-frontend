import { describe, expect, it } from "vitest";

import {
  buildCodeIndex,
  columnHeader,
  defaultRuleFor,
  isAllocatableCode,
  pickerEntries,
} from "./code-tree";
import { GROUP_KAB, ITEM_KALIP, LEAF_BETON, LEAF_KALIP, LEAF_PRIZ_CAT, codeTree } from "./diary-fixtures";

const index = buildCodeIndex(codeTree());

describe("columnHeader — ızgara kolon başlığı (İ:452-458)", () => {
  it("yaprak: kalem kodu + 'kalem · bölüm'", () => {
    expect(columnHeader(LEAF_KALIP, index, null)).toEqual({ code: "KAB.01.01", short: "Kalıp · Kat 6–10", isLeaf: true, isKnown: true });
  });

  it("üst grup: disiplin kodu + grup adı", () => {
    expect(columnHeader(GROUP_KAB, index, null)).toEqual({ code: "KAB", short: "Betonarme işleri", isLeaf: false, isKnown: true });
  });

  it("ağaçta olmayan kod (baseline değişti): backend etiketi ya da kimlik, bilinmiyor işaretli", () => {
    expect(columnHeader("l:eski:none", index, "Eski kalem")).toMatchObject({ short: "Eski kalem", isKnown: false });
    expect(columnHeader("l:eski:none", index, null)).toMatchObject({ short: "l:eski:none", isKnown: false });
  });
});

describe("pickerEntries — '+ İş kodu ekle' ağacı (İ:410-419, İ:636-641)", () => {
  it("disiplin ve kalem BAŞLIKTIR (seçilemez); grup ve yaprak seçilir; oransız yaprak pasif", () => {
    const entries = pickerEntries(codeTree(), "", new Set([LEAF_KALIP]));
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    expect(byId["d:kaba"]).toMatchObject({ kind: "discipline", selectable: false });
    expect(byId[`i:${ITEM_KALIP}`]).toMatchObject({ kind: "item", selectable: false, code: "KAB.01.01" });
    expect(byId[GROUP_KAB]).toMatchObject({ kind: "group", selectable: true, label: "Betonarme işleri (üst grup)" });
    expect(byId[LEAF_KALIP]).toMatchObject({ kind: "leaf", selectable: true, selected: true, label: "Kat 6–10" });
    expect(byId[LEAF_PRIZ_CAT]).toMatchObject({ kind: "leaf", selectable: false, noRate: true, label: "Bölümsüz · oran yok" });
  });

  it("arama kalem adı/bölüm/kod üzerinde; eşleşen yaprağın ataları başlık olarak kalır", () => {
    const entries = pickerEntries(codeTree(), "beton", new Set());
    expect(entries.map((e) => e.id)).toEqual(["d:kaba", GROUP_KAB, `i:${LEAF_BETON.split(":")[1]}`, LEAF_BETON]);
  });

  it("eşleşme yoksa boş liste", () => {
    expect(pickerEntries(codeTree(), "zzz", new Set())).toEqual([]);
  });
});

describe("kural ve izin", () => {
  it("varsayılan kip: yaprak doğrudan, üst düğüm miktara göre (İ:599 gmode 'qty')", () => {
    expect(defaultRuleFor(index.get(LEAF_KALIP))).toBe("direct");
    expect(defaultRuleFor(index.get(GROUP_KAB))).toBe("prorata_by_daily_qty");
  });

  it("isAllocatableCode oransız yaprağı ve ağaçta olmayanı eler", () => {
    const allowed = isAllocatableCode(index);
    expect(allowed(LEAF_KALIP)).toBe(true);
    expect(allowed(GROUP_KAB)).toBe(true);
    expect(allowed(LEAF_PRIZ_CAT)).toBe(false);
    expect(allowed("l:yok:none")).toBe(false);
  });
});

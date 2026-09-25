import { describe, expect, it } from "vitest";

import type { DiaryLineRef } from "@/components/site-diary/diary-extension";

import { buildCodeIndex } from "./code-tree";
import { formatEarned, leafNodeIdForLine, lineProgress } from "./line-progress";
import { ITEM_BETON, ITEM_KALIP, ITEM_PRIZ, LEAF_KALIP, SEC_K610, codeTree, dayView } from "./diary-fixtures";

function line(boqItemId: string, sectionId: string | null): DiaryLineRef {
  return { key: `${boqItemId}:${sectionId ?? ""}`, boqItemId, sectionId, quantityToday: "1" };
}

const index = buildCodeIndex(codeTree());
const progress = dayView().progress;

describe("leafNodeIdForLine — satır (kalem × bölüm) → yaprak düğüm kimliği (B2 `leaf_node_id`)", () => {
  it("bölümlü ve Bölümsüz (G1)", () => {
    expect(leafNodeIdForLine(line(ITEM_KALIP, SEC_K610))).toBe(LEAF_KALIP);
    expect(leafNodeIdForLine(line(ITEM_PRIZ, null))).toBe(`l:${ITEM_PRIZ}:none`);
  });
});

describe("lineProgress — 'Bugün kaz. a-s' + PF hücreleri backend payload'ından", () => {
  it("oranlı yaprak: kazanılmış 1 ondalık, PF ham string (bant sunumda)", () => {
    expect(lineProgress(line(ITEM_KALIP, SEC_K610), progress, index)).toEqual({
      earned: "79,1",
      pf: "0.9449",
      noRate: false,
    });
  });

  it("oransız yaprak (K12): kazanılmış '—', PF yok, uyarı işareti", () => {
    expect(lineProgress(line(ITEM_PRIZ, null), progress, index)).toEqual({ earned: "—", pf: null, noRate: true });
  });

  it("payload'da olmayan satır (henüz kaydedilmedi) '—'", () => {
    expect(lineProgress(line(ITEM_BETON, null), progress, index)).toEqual({ earned: "—", pf: null, noRate: false });
    expect(lineProgress(line(ITEM_KALIP, SEC_K610), null, index)).toEqual({ earned: "—", pf: null, noRate: false });
  });
});

describe("formatEarned", () => {
  it("1 ondalık ROUND_HALF_UP, tr-TR; boş '—'", () => {
    expect(formatEarned("79.05")).toBe("79,1");
    expect(formatEarned("1234.5")).toBe("1.234,5");
    expect(formatEarned(null)).toBe("—");
  });
});

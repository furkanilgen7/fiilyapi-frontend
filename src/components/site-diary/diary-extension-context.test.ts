import { describe, it, expect } from "vitest";

import { buildDiaryExtensionContext, isSameDiaryExtensionContext } from "./diary-extension-context";
import type { DiaryLeafRow } from "./diary-lines-tree";

function leaf(overrides: Partial<DiaryLeafRow> = {}): DiaryLeafRow {
  return {
    key: "duv|k610",
    boqItemId: "duv",
    sectionId: "k610",
    label: "Kat 6–10",
    sectionCode: "K610",
    isUnsectioned: false,
    isAdded: false,
    isRemovable: true,
    isOrphan: false,
    todayText: "52",
    todayValue: "52",
    cumulative: "200",
    planned: "4400",
    remaining: "4200",
    isOverrun: false,
    overrunExcess: null,
    amount: "21840.00",
    ...overrides,
  };
}

describe("buildDiaryExtensionContext", () => {
  it("kanonik şantiye, gün, kayıt ve satırları (formdaki GÜNCEL miktarla) taşır", () => {
    const ctx = buildDiaryExtensionContext({
      siteId: "site-uuid",
      day: "2026-09-24",
      entry: { id: "d-1", status: "draft" },
      leaves: [leaf(), leaf({ key: "duv|", sectionId: null, todayText: "", todayValue: "0" })],
    });

    expect(ctx).toEqual({
      siteId: "site-uuid",
      day: "2026-09-24",
      entryId: "d-1",
      entryStatus: "draft",
      lines: [
        { key: "duv|k610", boqItemId: "duv", sectionId: "k610", quantityToday: "52" },
        { key: "duv|", boqItemId: "duv", sectionId: null, quantityToday: null },
      ],
    });
  });

  it("şantiye çözülmediyse / kayıt yoksa null'lar", () => {
    const ctx = buildDiaryExtensionContext({ siteId: "", day: "2026-09-24", entry: undefined, leaves: [] });

    expect(ctx).toMatchObject({ siteId: null, entryId: null, entryStatus: null, lines: [] });
  });
});

describe("isSameDiaryExtensionContext", () => {
  const base = buildDiaryExtensionContext({
    siteId: "s",
    day: "2026-09-24",
    entry: { id: "d-1", status: "draft" },
    leaves: [leaf()],
  });

  it("aynı değerli yeni nesne AYNIDIR (gereksiz çağrı yok)", () => {
    expect(isSameDiaryExtensionContext(base, { ...base, lines: base.lines.map((line) => ({ ...line })) })).toBe(true);
  });

  it("miktar, durum ya da gün değişince FARKLIDIR; ilk bildirim her zaman yapılır", () => {
    expect(isSameDiaryExtensionContext(null, base)).toBe(false);
    expect(isSameDiaryExtensionContext(base, { ...base, entryStatus: "submitted" })).toBe(false);
    expect(isSameDiaryExtensionContext(base, { ...base, day: "2026-09-25" })).toBe(false);
    expect(
      isSameDiaryExtensionContext(base, { ...base, lines: [{ ...base.lines[0], quantityToday: "53" }] }),
    ).toBe(false);
  });
});

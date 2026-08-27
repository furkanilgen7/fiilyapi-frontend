import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

import { partitionSectionDiaryEntries } from "./section-diary";

// F-BLMSEK T1 · "Günlük Kayıt" sekmesinin SAF süzgeci. Bileşenden AYRI test
// edilir (WORKFLOW §4 "saf türevler ayrı .ts").

const TARGET = "sec-target";
const OTHER = "sec-other";

function listItem(overrides: Partial<SiteDiaryEntryListItem> = {}): SiteDiaryEntryListItem {
  return {
    id: "d-1",
    site_id: "s-1",
    project_id: "p-1",
    entry_date: "2026-07-15",
    section_id: null,
    weather: "sunny",
    has_incident: false,
    status: "submitted",
    worker_total: 42,
    lines_total: "182400.00",
    created_by: "u-2",
    created_at: "2026-07-15T08:00:00Z",
    ...overrides,
  } as SiteDiaryEntryListItem;
}

/**
 * 🔴 K-IKIZ1 — KARŞI KANIT TAŞIYAN KÜME. Fikstür ÜÇ ayrı `section_id` hâli
 * taşır: hedef bölüm · BAŞKA bölüm · atanmamış (`null`). Yalnız hedefin
 * satırlarından kurulu bir fikstür, HİÇ SÜZMEYEN bir fonksiyonda da yeşil
 * kalırdı — o test hiçbir şeyi bekçilemez.
 */
const MIXED: SiteDiaryEntryListItem[] = [
  listItem({ id: "hedef-1", section_id: TARGET, entry_date: "2026-07-15" }),
  listItem({ id: "baska-1", section_id: OTHER, entry_date: "2026-07-16" }),
  listItem({ id: "atanmamis-1", section_id: null, entry_date: "2026-07-17" }),
  listItem({ id: "hedef-2", section_id: TARGET, entry_date: "2026-07-18" }),
  listItem({ id: "atanmamis-2", section_id: null, entry_date: "2026-07-19" }),
];

describe("partitionSectionDiaryEntries", () => {
  it("YALNIZ hedef bölümün kayıtlarını döndürür", () => {
    const result = partitionSectionDiaryEntries(MIXED, TARGET);

    expect(result.entries.map((entry) => entry.id)).toEqual(["hedef-1", "hedef-2"]);
  });

  it("BAŞKA bölümün kaydı listede YOKTUR ve sayılır (karşı kanıt)", () => {
    const result = partitionSectionDiaryEntries(MIXED, TARGET);

    expect(result.entries.map((entry) => entry.id)).not.toContain("baska-1");
    expect(result.otherSectionCount).toBe(1);
  });

  it("bölüme ATANMAMIŞ (`section_id: null`) kayıt listede YOKTUR ve sayılır", () => {
    // 🔴 Ürün kararı: `null` = "bölüme atanmadı", "tüm bölümler" DEĞİL.
    const result = partitionSectionDiaryEntries(MIXED, TARGET);

    expect(result.entries.map((entry) => entry.id)).not.toContain("atanmamis-1");
    expect(result.entries.map((entry) => entry.id)).not.toContain("atanmamis-2");
    expect(result.unassignedCount).toBe(2);
  });

  it("hedefin kaydı yokken bile diğer iki sayaç DOĞRU kalır", () => {
    const result = partitionSectionDiaryEntries(MIXED, "sec-bos");

    expect(result.entries).toEqual([]);
    expect(result.unassignedCount).toBe(2);
    // Hedef olmayan ÜÇ atanmış satır: hedef-1, baska-1, hedef-2.
    expect(result.otherSectionCount).toBe(3);
  });

  it("boş girdide her üç alan da boş/sıfırdır", () => {
    const result = partitionSectionDiaryEntries([], TARGET);

    expect(result.entries).toEqual([]);
    expect(result.unassignedCount).toBe(0);
    expect(result.otherSectionCount).toBe(0);
  });

  it("girdi dizisini DEĞİŞTİRMEZ (bağışıklık)", () => {
    const input = [...MIXED];
    partitionSectionDiaryEntries(input, TARGET);

    expect(input.map((entry) => entry.id)).toEqual(MIXED.map((entry) => entry.id));
  });
});

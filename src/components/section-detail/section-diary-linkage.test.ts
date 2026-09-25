import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

import { sectionDiaryRowLinkage } from "./section-diary-linkage";

// DET-1.1 · Kural A işareti — liste satırı bu bölüme BAŞLIKLA mı, SATIRLA mı bağlı?

const SECTIONS = [
  { id: "sec-k610", name: "Kat 6–10" },
  { id: "sec-k15", name: "Kat 1–5" },
];

const item = (sectionId: string | null) => ({ section_id: sectionId }) as SiteDiaryEntryListItem;

describe("sectionDiaryRowLinkage", () => {
  it("başlığı BU bölüm olan gün işaretlenmez (null)", () => {
    expect(sectionDiaryRowLinkage(item("sec-k610"), "sec-k610", SECTIONS)).toBeNull();
  });

  it("başlığı BAŞKA bölüm olan gün: başlık bölümünün ADI şantiye bölümlerinden çözülür", () => {
    expect(sectionDiaryRowLinkage(item("sec-k15"), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Kat 1–5",
    });
  });

  it("başlık bölümü seçilmemiş gün de satırla bağlıdır — 'Bölüm seçilmedi'", () => {
    expect(sectionDiaryRowLinkage(item(null), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Bölüm seçilmedi",
    });
  });

  it("ad çözülemezse (liste dışı bölüm) ham kimlik BASILMAZ", () => {
    expect(sectionDiaryRowLinkage(item("sec-yok"), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Bölüm adı yok",
    });
  });
});

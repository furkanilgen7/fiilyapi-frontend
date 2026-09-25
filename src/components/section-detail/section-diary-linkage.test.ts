import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

import { sectionDiaryLinkageMeta, sectionDiaryRowLinkage } from "./section-diary-linkage";

// DET-1.1 · Kural A işareti — liste satırı bu bölüme BAŞLIKLA mı, SATIRLA mı bağlı?

const SECTIONS = [
  { id: "sec-k610", name: "Kat 6–10" },
  { id: "sec-k15", name: "Kat 1–5" },
];

const item = (
  sectionId: string | null,
  extra: Partial<Pick<SiteDiaryEntryListItem, "section_name" | "section_line_count">> = {},
) => ({ section_id: sectionId, section_name: null, section_line_count: null, ...extra }) as SiteDiaryEntryListItem;

describe("sectionDiaryRowLinkage", () => {
  it("başlığı BU bölüm olan gün işaretlenmez (null)", () => {
    expect(sectionDiaryRowLinkage(item("sec-k610"), "sec-k610", SECTIONS)).toBeNull();
  });

  it("başlığı BAŞKA bölüm olan gün: başlık bölümünün ADI şantiye bölümlerinden çözülür", () => {
    expect(sectionDiaryRowLinkage(item("sec-k15"), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Kat 1–5",
      lineCount: null,
    });
  });

  it("başlık bölümü seçilmemiş gün de satırla bağlıdır — 'Bölüm seçilmedi'", () => {
    expect(sectionDiaryRowLinkage(item(null), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Bölüm seçilmedi",
      lineCount: null,
    });
  });

  it("ad çözülemezse (liste dışı bölüm) ham kimlik BASILMAZ", () => {
    expect(sectionDiaryRowLinkage(item("sec-yok"), "sec-k610", SECTIONS)).toEqual({
      headerSectionName: "Bölüm adı yok",
      lineCount: null,
    });
  });

  it("DET-1.B ek (backend#130): ad SUNUCUDAN (`section_name`) öncelikli, sayı `section_line_count`", () => {
    expect(
      sectionDiaryRowLinkage(item("sec-k15", { section_name: "Kat 1–5 (yeni ad)", section_line_count: 2 }), "sec-k610", SECTIONS),
    ).toEqual({ headerSectionName: "Kat 1–5 (yeni ad)", lineCount: 2 });
  });

  it("metin: sayı varsa 'Başlık: X · bu bölüme N satır', yoksa yalnız 'Başlık: X'", () => {
    expect(sectionDiaryLinkageMeta({ headerSectionName: "Kat 1–5", lineCount: 2 })).toBe("Başlık: Kat 1–5 · bu bölüme 2 satır");
    expect(sectionDiaryLinkageMeta({ headerSectionName: "Kat 1–5", lineCount: null })).toBe("Başlık: Kat 1–5");
  });
});

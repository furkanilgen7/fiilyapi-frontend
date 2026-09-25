import { describe, it, expect } from "vitest";

import type { SiteDiaryEntryDetail, SiteDiaryLineRead } from "@/lib/api/hooks/useSiteDiary";

import {
  diaryDetailAuthor,
  diaryDetailLinkage,
  diaryDetailLock,
  formatDayMonthDots,
} from "./derive";

// DET-1.2 · başlık kartının SAF türevleri (bileşenden ayrı test edilir).

const CURRENT = { id: "sec-k610", name: "Kat 6–10 Kaba İnşaat" };

function line(sectionId: string | null): SiteDiaryLineRead {
  return { id: `l-${sectionId}`, section_id: sectionId } as SiteDiaryLineRead;
}

function entry(overrides: Partial<SiteDiaryEntryDetail> = {}): SiteDiaryEntryDetail {
  return {
    section_id: CURRENT.id,
    section_name: CURRENT.name,
    status: "submitted",
    created_at: "2026-09-24T05:12:00Z",
    created_by_name: "Hasan Kaya",
    submitted_at: "2026-09-24T15:40:00Z",
    submitted_by_name: "Sercan Öztürk",
    locked: false,
    lock_report_date: null,
    lines: [],
    ...overrides,
  } as SiteDiaryEntryDetail;
}

describe("formatDayMonthDots", () => {
  it("ISO günü gezinme etiketine çevirir (HÖ:90 '24.09')", () => {
    expect(formatDayMonthDots("2026-09-24")).toBe("24.09");
    expect(formatDayMonthDots("2026-03-02")).toBe("02.03");
  });

  it("ayrıştırılamayan girdi olduğu gibi döner", () => {
    expect(formatDayMonthDots("bozuk")).toBe("bozuk");
  });
});

describe("diaryDetailLinkage — Kural A", () => {
  it("başlık bölümü BU bölümse bağ 'header'dır (rozet yok)", () => {
    expect(diaryDetailLinkage(entry(), CURRENT)).toEqual({ kind: "header" });
  });

  it("başlık BAŞKA bölümse 'lines' — bu bölüme düşen satırlar SAYILIR (uydurulmaz)", () => {
    const linkage = diaryDetailLinkage(
      entry({
        section_id: "sec-k15",
        section_name: "Kat 1–5 İnce İşler",
        lines: [line(CURRENT.id), line("sec-k15"), line(CURRENT.id), line(null)],
      }),
      CURRENT,
    );
    expect(linkage).toEqual({
      kind: "lines",
      headerSectionName: "Kat 1–5 İnce İşler",
      currentSectionName: CURRENT.name,
      lineCount: 2,
    });
  });

  it("başlık bölümü SEÇİLMEMİŞ günde ad 'Bölüm seçilmedi'dir", () => {
    const linkage = diaryDetailLinkage(entry({ section_id: null, section_name: null }), CURRENT);
    expect(linkage).toMatchObject({ kind: "lines", headerSectionName: "Bölüm seçilmedi" });
  });

  it("bölüm bağlamı bilinmiyorsa (bölüm okunamadı) iddia KURULMAZ", () => {
    expect(diaryDetailLinkage(entry({ section_id: "baska" }), undefined)).toEqual({ kind: "header" });
  });
});

describe("diaryDetailLock — S9 kilit rozeti", () => {
  it("kilitsiz günde null", () => {
    expect(diaryDetailLock(entry())).toBeNull();
  });

  it("rapor tarihli kilit: hap ve bant metni tarihi taşır (İ:145 / İ:144-148)", () => {
    expect(diaryDetailLock(entry({ locked: true, lock_report_date: "2026-09-25" }))).toEqual({
      pillLabel: "Kilitli · 25.09.2026 raporu",
      bandTitle: "Bu gün 25.09.2026 raporuyla kilitlendi.",
    });
  });

  it("rapor tarihi yoksa tarih UYDURULMAZ", () => {
    expect(diaryDetailLock(entry({ locked: true, lock_report_date: null }))).toEqual({
      pillLabel: "Kilitli",
      bandTitle: "Bu gün kilitlendi.",
    });
  });
});

describe("diaryDetailAuthor — Oluşturan / Gönderen satırı", () => {
  it("gönderilmiş kayıtta iki taraf da Europe/Istanbul saatiyle basılır", () => {
    expect(diaryDetailAuthor(entry())).toEqual({
      createdBy: "Hasan Kaya",
      createdAt: "24.09 08:12",
      submitted: { by: "Sercan Öztürk", at: "24.09 18:40" },
    });
  });

  it("taslakta gönderen YOKTUR (mockup (b) 'Henüz gönderilmedi')", () => {
    const author = diaryDetailAuthor(
      entry({ status: "draft", submitted_at: null, submitted_by_name: null }),
    );
    expect(author.submitted).toBeNull();
  });

  it("silinmiş kullanıcının adı yoksa '—' basılır (ad uydurulmaz)", () => {
    const author = diaryDetailAuthor(entry({ created_by_name: null, submitted_by_name: null }));
    expect(author.createdBy).toBe("—");
    expect(author.submitted?.by).toBe("—");
  });
});

import { describe, it, expect } from "vitest";

import {
  collectSectionInputs,
  emptySectionRow,
  validateSections,
  type SectionRow,
} from "./sections-validate";

function row(overrides: Partial<SectionRow> = {}): SectionRow {
  return { ...emptySectionRow(), ...overrides };
}

describe("validateSections", () => {
  it("tumu bos satir sessizce atilir, hata uretmez", () => {
    expect(validateSections([row(), row()], { isDraft: false })).toEqual([]);
  });

  it("adi bos ama baska alani dolu satir 'Bolum adi zorunludur.' hatasi verir", () => {
    const issues = validateSections([row({ startDate: "2026-01-01" })], { isDraft: false });
    expect(issues).toEqual([{ index: 0, field: "name", message: "Bölüm adı zorunludur." }]);
  });

  it("bolum bitis < baslangic 'Bolum bitis tarihi baslangictan once olamaz.' verir", () => {
    const issues = validateSections(
      [row({ name: "A Blok", startDate: "2026-06-01", endDate: "2026-01-01" })],
      { isDraft: false },
    );
    expect(issues).toEqual([
      { index: 0, field: "endDate", message: "Bölüm bitiş tarihi başlangıçtan önce olamaz." },
    ]);
  });

  it("esit tarihler gecerlidir (tek gunluk bolum)", () => {
    const issues = validateSections(
      [row({ name: "A Blok", startDate: "2026-01-01", endDate: "2026-01-01" })],
      { isDraft: false },
    );
    expect(issues).toEqual([]);
  });

  it("ayni ad iki satirda uyari uretmez", () => {
    const issues = validateSections([row({ name: "A Blok" }), row({ name: "A Blok" })], {
      isDraft: false,
    });
    expect(issues).toEqual([]);
  });

  it("taslakta adsiz-dolu satir hata vermez, sessizce atilir", () => {
    const issues = validateSections([row({ startDate: "2026-01-01" })], { isDraft: true });
    expect(issues).toEqual([]);
  });

  it("taslakta bolum tarih sirasi yine uygulanir", () => {
    const issues = validateSections(
      [row({ name: "A Blok", startDate: "2026-06-01", endDate: "2026-01-01" })],
      { isDraft: true },
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe("endDate");
  });

  it("hata indeksi tablodaki satir sirasindan gelir", () => {
    const issues = validateSections([row({ name: "A" }), row({ endDate: "2026-01-01" })], {
      isDraft: false,
    });
    expect(issues[0].index).toBe(1);
  });
});

describe("collectSectionInputs", () => {
  it("govdeye {name, manager_user_id?, start_date?, end_date?} uretir", () => {
    const inputs = collectSectionInputs([
      row({
        name: "Temel & Bodrum Katlar",
        managerUserId: "u-1",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
      }),
    ]);
    expect(inputs).toEqual([
      {
        name: "Temel & Bodrum Katlar",
        manager_user_id: "u-1",
        start_date: "2026-01-01",
        end_date: "2026-06-30",
      },
    ]);
  });

  it("bos alanlar govdede HIC YER ALMAZ (sorumlusuz/tarihsiz bolum gecerlidir)", () => {
    const inputs = collectSectionInputs([row({ name: "A Blok" })]);
    expect(inputs).toEqual([{ name: "A Blok" }]);
    expect(Object.keys(inputs[0])).toEqual(["name"]);
  });

  it("tumu bos ve adsiz satirlar atlanir", () => {
    const inputs = collectSectionInputs([row(), row({ name: "A Blok" }), row({ startDate: "x" })]);
    expect(inputs).toEqual([{ name: "A Blok" }]);
  });

  it("govdede sort_order YOK", () => {
    const inputs = collectSectionInputs([row({ name: "A Blok" })]);
    expect(inputs[0]).not.toHaveProperty("sort_order");
  });

  it("govdede estimated_amount YOK", () => {
    const inputs = collectSectionInputs([row({ name: "A Blok" })]);
    expect(inputs[0]).not.toHaveProperty("estimated_amount");
  });

  it("govdede manager_name YOK", () => {
    const inputs = collectSectionInputs([row({ name: "A Blok", managerUserId: "u-1" })]);
    expect(inputs[0]).not.toHaveProperty("manager_name");
  });

  it("ad bastaki/sondaki bosluklardan arindirilir", () => {
    expect(collectSectionInputs([row({ name: "  A Blok  " })])).toEqual([{ name: "A Blok" }]);
  });
});

describe("emptySectionRow", () => {
  it("her cagrida BENZERSIZ id uretir (index key olamaz)", () => {
    expect(emptySectionRow().id).not.toBe(emptySectionRow().id);
  });
});

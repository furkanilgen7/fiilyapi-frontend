import { describe, it, expect } from "vitest";

import { emptySectionFormValues, type SectionFormValues } from "./form-state";
import { MESSAGES, validateSectionForm } from "./validate";

function values(overrides: Partial<SectionFormValues> = {}): SectionFormValues {
  return { ...emptySectionFormValues(), ...overrides };
}

const AVAILABLE = { isUserListUnavailable: false };

describe("validateSectionForm — taslak (is_draft: true)", () => {
  it("ad HARİÇ hiçbir zorunluluk uygulanmaz", () => {
    const errors = validateSectionForm(values({ name: "Temel" }), { isDraft: true, ...AVAILABLE });
    expect(errors).toEqual({});
  });

  it("ad boşsa taslakta da hata verir (Pydantic min_length=1 her iki yolda)", () => {
    const errors = validateSectionForm(values({ name: "" }), { isDraft: true, ...AVAILABLE });
    expect(errors.name).toBe(MESSAGES.nameRequired);
  });

  it("tarih tutarlılığı taslakta da UYGULANIR", () => {
    const errors = validateSectionForm(
      values({ name: "Temel", startDate: "2026-05-01", endDate: "2026-04-01" }),
      { isDraft: true, ...AVAILABLE },
    );
    expect(errors.endDate).toBe(MESSAGES.endBeforeStart);
  });

  it("section_type/manager/tarih/bütçe boş olsa da taslakta hata YOK", () => {
    const errors = validateSectionForm(values({ name: "Temel" }), { isDraft: true, ...AVAILABLE });
    expect(errors.sectionType).toBeUndefined();
    expect(errors.managerUserId).toBeUndefined();
    expect(errors.startDate).toBeUndefined();
    expect(errors.budgetAmount).toBeUndefined();
  });
});

describe("validateSectionForm — taslak dışı (is_draft: false, Bölümü Oluştur)", () => {
  const base = { name: "Temel", sectionType: "structural" as const, managerUserId: "u1", startDate: "2026-01-01", endDate: "2026-02-01", budgetAmount: "1000" };

  it("tüm alanlar doluysa hata yok", () => {
    const errors = validateSectionForm(values(base), { isDraft: false, ...AVAILABLE });
    expect(errors).toEqual({});
  });

  it("section_type boşsa 'Bölüm tipi seçiniz.'", () => {
    const errors = validateSectionForm(values({ ...base, sectionType: "" }), { isDraft: false, ...AVAILABLE });
    expect(errors.sectionType).toBe(MESSAGES.sectionTypeRequired);
  });

  it("managerUserId boşsa 'Bölüm sorumlusu seçiniz.' (liste mevcutken)", () => {
    const errors = validateSectionForm(values({ ...base, managerUserId: "" }), { isDraft: false, ...AVAILABLE });
    expect(errors.managerUserId).toBe(MESSAGES.managerRequired);
  });

  it("kullanıcı listesi yüklenemediyse sorumlu zorunluluğu kalkar", () => {
    const errors = validateSectionForm(values({ ...base, managerUserId: "" }), {
      isDraft: false,
      isUserListUnavailable: true,
    });
    expect(errors.managerUserId).toBeUndefined();
  });

  it("startDate boşsa 'Başlangıç ve planlanan bitiş tarihi zorunludur.'", () => {
    const errors = validateSectionForm(values({ ...base, startDate: "" }), { isDraft: false, ...AVAILABLE });
    expect(errors.startDate).toBe(MESSAGES.datesRequired);
  });

  it("endDate boşsa aynı mesaj startDate alanına düşer", () => {
    const errors = validateSectionForm(values({ ...base, endDate: "" }), { isDraft: false, ...AVAILABLE });
    expect(errors.startDate).toBe(MESSAGES.datesRequired);
  });

  it("budget_amount boşsa 'Bölüm bedeli zorunludur.'", () => {
    const errors = validateSectionForm(values({ ...base, budgetAmount: "" }), { isDraft: false, ...AVAILABLE });
    expect(errors.budgetAmount).toBe(MESSAGES.budgetRequired);
  });

  it("budget_amount '0' iken GEÇERLİDİR — is None kontrolü, falsy DEĞİL", () => {
    const errors = validateSectionForm(values({ ...base, budgetAmount: "0" }), { isDraft: false, ...AVAILABLE });
    expect(errors.budgetAmount).toBeUndefined();
  });

  it("tarih sırası ters ise startDate/endDate zorunluluğundan ÖNCE tutarlılık hatası basılır", () => {
    const errors = validateSectionForm(
      values({ ...base, startDate: "2026-05-01", endDate: "2026-04-01" }),
      { isDraft: false, ...AVAILABLE },
    );
    expect(errors.endDate).toBe(MESSAGES.endBeforeStart);
    expect(errors.startDate).toBeUndefined();
  });
});

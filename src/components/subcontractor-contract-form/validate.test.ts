import { describe, it, expect } from "vitest";

import { emptySubcontractorContractFormValues } from "./form-state";
import { MESSAGES, hasContractFormErrors, validateContractForm } from "./validate";

function values(overrides: Partial<ReturnType<typeof emptySubcontractorContractFormValues>> = {}) {
  return { ...emptySubcontractorContractFormValues(), ...overrides };
}

/** Yayına alma yolunda geçerli olan tam dolu form. */
function completeValues() {
  return values({
    projectId: "p-1",
    siteId: "s-1",
    subcontractorId: "sub-1",
    workCategory: "Betonarme",
    contractNo: "TSZ-2026-004",
    signatureDate: "2026-01-10",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
  });
}

describe("validateContractForm — zorunlu alanlar (mockup yıldızları)", () => {
  it("yayına almada sekiz zorunlu alanın hepsini bildirir", () => {
    const errors = validateContractForm(values(), { isDraft: false });
    expect(errors.projectId).toBe(MESSAGES.projectRequired);
    expect(errors.siteId).toBe(MESSAGES.siteRequired);
    expect(errors.subcontractorId).toBe(MESSAGES.subcontractorRequired);
    expect(errors.workCategory).toBe(MESSAGES.workCategoryRequired);
    expect(errors.contractNo).toBe(MESSAGES.contractNoRequired);
    expect(errors.signatureDate).toBe(MESSAGES.signatureDateRequired);
    expect(errors.startDate).toBe(MESSAGES.startDateRequired);
    expect(errors.endDate).toBe(MESSAGES.endDateRequired);
  });

  it("tam dolu formda hata yoktur", () => {
    expect(hasContractFormErrors(validateContractForm(completeValues(), { isDraft: false }))).toBe(
      false,
    );
  });

  it("taslakta YALNIZ proje zorunludur (uç proje altında açılır)", () => {
    const errors = validateContractForm(values(), { isDraft: true });
    expect(errors.projectId).toBe(MESSAGES.projectRequired);
    expect(errors.contractNo).toBeUndefined();
    expect(errors.siteId).toBeUndefined();
    expect(errors.endDate).toBeUndefined();

    expect(
      hasContractFormErrors(validateContractForm(values({ projectId: "p-1" }), { isDraft: true })),
    ).toBe(false);
  });
});

describe("validateContractForm — sayısal sınırlar (openapi)", () => {
  it("avans ve teminat oranı 0-100 dışına çıkamaz", () => {
    const errors = validateContractForm(
      values({ projectId: "p-1", advancePct: "120", retainagePct: "-1" }),
      { isDraft: true },
    );
    expect(errors.advancePct).toBe(MESSAGES.pctRange);
    expect(errors.retainagePct).toBe(MESSAGES.pctRange);
  });

  it("sınır değerleri (0 ve 100) geçerlidir", () => {
    const errors = validateContractForm(
      values({ projectId: "p-1", advancePct: "0", retainagePct: "100" }),
      { isDraft: true },
    );
    expect(errors.advancePct).toBeUndefined();
    expect(errors.retainagePct).toBeUndefined();
  });

  it("ödeme vadesi negatif veya ondalık olamaz", () => {
    expect(
      validateContractForm(values({ projectId: "p-1", paymentTermDays: "-5" }), { isDraft: true })
        .paymentTermDays,
    ).toBe(MESSAGES.termDaysInvalid);
    expect(
      validateContractForm(values({ projectId: "p-1", paymentTermDays: "30.5" }), { isDraft: true })
        .paymentTermDays,
    ).toBe(MESSAGES.termDaysInvalid);
  });

  it("gecikme cezası negatif olamaz", () => {
    expect(
      validateContractForm(values({ projectId: "p-1", latePenaltyDaily: "-1" }), { isDraft: true })
        .latePenaltyDaily,
    ).toBe(MESSAGES.latePenaltyInvalid);
  });
});

describe("validateContractForm — tarih tutarlılığı", () => {
  it("bitiş, işe başlamadan önce olamaz — TASLAKTA DA", () => {
    const errors = validateContractForm(
      values({ projectId: "p-1", startDate: "2026-06-01", endDate: "2026-05-01" }),
      { isDraft: true },
    );
    expect(errors.endDate).toBe(MESSAGES.endBeforeStart);
  });

  it("tutarsızlık hatası, 'bitiş zorunlu' mesajıyla EZİLMEZ", () => {
    const errors = validateContractForm(
      { ...completeValues(), endDate: "2026-01-01" },
      { isDraft: false },
    );
    expect(errors.endDate).toBe(MESSAGES.endBeforeStart);
  });
});

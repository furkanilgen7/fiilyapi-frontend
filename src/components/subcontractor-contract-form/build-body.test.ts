import { describe, it, expect } from "vitest";

import {
  buildContractCreateBody,
  buildContractTermsUpdateBody,
  buildContractUpdateBody,
} from "./build-body";
import { emptySubcontractorContractFormValues } from "./form-state";

function filled() {
  return {
    ...emptySubcontractorContractFormValues(),
    projectId: "p-1",
    siteId: "s-1",
    subcontractorId: "sub-1",
    workCategory: "Betonarme",
    contractNo: "TSZ-2026-004",
    signatureDate: "2026-01-10",
    startDate: "2026-01-15",
    endDate: "2026-06-30",
    latePenaltyDaily: "5000",
    advancePct: "12",
    retainagePct: "7",
    paymentTermDays: "45",
    paymentPeriod: "biweekly" as const,
    isNotarized: true,
    materialsByContractor: true,
    vatWithholding: true,
  };
}

describe("buildContractCreateBody — mockup alanı → şema alanı eşlemesi", () => {
  it("her form alanını openapi adına yazar", () => {
    const body = buildContractCreateBody(filled(), { isDraft: false });
    expect(body).toMatchObject({
      site_id: "s-1",
      subcontractor_id: "sub-1",
      work_category: "Betonarme",
      contract_no: "TSZ-2026-004",
      signature_date: "2026-01-10",
      is_notarized: true,
      start_date: "2026-01-15",
      end_date: "2026-06-30",
      late_penalty_daily: "5000",
      advance_pct: "12",
      retainage_pct: "7",
      payment_period: "biweekly",
      payment_term_days: 45,
      materials_by_contractor: true,
      subcontractor_files_own_sgk: false,
      vat_withholding: true,
      is_draft: false,
    });
  });

  it("`project_id` gövdeye KONMAZ (yoldadır) ve `items` gönderilmez", () => {
    const body = buildContractCreateBody(filled(), { isDraft: false });
    expect(body).not.toHaveProperty("project_id");
    expect(body).not.toHaveProperty("items");
  });

  it("mockup'ta çizili olmayan iki alan şema varsayılanıyla gider", () => {
    const body = buildContractCreateBody(filled(), { isDraft: false });
    expect(body.vat_pct).toBe("20");
    expect(body.status).toBe("active");
  });

  it("boş metin alanları `null` gider, sayısal alanlar varsayılana düşer", () => {
    const body = buildContractCreateBody(emptySubcontractorContractFormValues(), {
      isDraft: true,
    });
    expect(body.contract_no).toBeNull();
    expect(body.signature_date).toBeNull();
    expect(body.start_date).toBeNull();
    expect(body.end_date).toBeNull();
    expect(body.late_penalty_daily).toBeNull();
    expect(body.site_id).toBeNull();
    expect(body.subcontractor_id).toBeNull();
    expect(body.advance_pct).toBe("10");
    expect(body.retainage_pct).toBe("5");
    expect(body.payment_term_days).toBe(30);
  });
});

describe("taslak / oluştur gövde farkı", () => {
  it("TEK fark `is_draft` bayrağıdır", () => {
    const draft = buildContractCreateBody(filled(), { isDraft: true });
    const publish = buildContractCreateBody(filled(), { isDraft: false });
    expect(draft.is_draft).toBe(true);
    expect(publish.is_draft).toBe(false);
    expect({ ...draft, is_draft: false }).toEqual(publish);
  });

  it("güncelleme gövdesinde de aynı fark geçerlidir", () => {
    expect(buildContractUpdateBody(filled(), { isDraft: true }).is_draft).toBe(true);
    expect(buildContractUpdateBody(filled(), { isDraft: false }).is_draft).toBe(false);
  });
});

describe("buildContractTermsUpdateBody — T7'nin paylaşılan PATCH gövdesi", () => {
  it("YALNIZ şart alanlarını taşır; bağlam alanlarına dokunmaz", () => {
    const body = buildContractTermsUpdateBody(filled());
    expect(body).not.toHaveProperty("site_id");
    expect(body).not.toHaveProperty("subcontractor_id");
    expect(body).not.toHaveProperty("work_category");
    expect(body).not.toHaveProperty("is_draft");
    expect(body.contract_no).toBe("TSZ-2026-004");
    expect(body.payment_period).toBe("biweekly");
  });
});

import { describe, it, expect } from "vitest";

import {
  buildProjectCreateBody,
  emptyProjectFormValues,
  type ProjectFormValues,
} from "./form-state";
import { hasErrors, taxNumberError, validateProjectForm } from "./validate";

function withValues(patch: Partial<ProjectFormValues>): ProjectFormValues {
  return { ...emptyProjectFormValues(), ...patch };
}

/** Tam dolu, geçerli taahhüt formu. */
function validContracting(): ProjectFormValues {
  const base = emptyProjectFormValues();
  return {
    ...base,
    basic: {
      ...base.basic,
      name: "Güneşkent Konut Kompleksi",
      category: "Konut",
      city: "Çankaya / Ankara",
    },
    employer: { employerId: "emp-1" },
    contract: {
      ...base.contract,
      contractNo: "SZL-2026-005",
      signatureDate: "2026-01-10",
      amount: "22400000",
      startDate: "2026-02-01",
      endDate: "2027-11-01",
      baseIndexValue: "1.000",
    },
  };
}

describe("validateProjectForm — zorunluluk kuralları (§4.10)", () => {
  it("geçerli taahhüt formunda hata yok", () => {
    expect(hasErrors(validateProjectForm(validContracting(), { isDraft: false }))).toBe(
      false,
    );
  });

  it("boş formda mesajlar birebir §4.10 tablosundan", () => {
    const errors = validateProjectForm(emptyProjectFormValues(), { isDraft: false });
    expect(errors.basic.name).toBe("Proje adı zorunludur.");
    expect(errors.basic.category).toBe("Tür seçiniz.");
    expect(errors.basic.city).toBe("İl / ilçe zorunludur.");
    expect(errors.employer).toBe("İşveren firma seçiniz.");
    expect(errors.contract.contractNo).toBe("Sözleşme no zorunludur.");
    expect(errors.contract.signatureDate).toBe("İmza tarihi zorunludur.");
    expect(errors.contract.amount).toBe("Sözleşme bedeli sayı olmalıdır.");
    expect(errors.contract.startDate).toBe("Başlangıç ve bitiş tarihi zorunludur.");
    expect(errors.contract.endDate).toBe("Başlangıç ve bitiş tarihi zorunludur.");
    expect(errors.contract.baseIndexValue).toBe(
      "Endeks tipi ve baz endeks değeri zorunludur.",
    );
  });

  it("fiyat farkı kapalıyken endeks zorunlu değil", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      {
        ...values,
        contract: { ...values.contract, hasPriceEscalation: false, baseIndexValue: "" },
      },
      { isDraft: false },
    );
    expect(errors.contract.baseIndexValue).toBeUndefined();
  });

  it("taahhüt dışı tiplerde işveren/sözleşme zorunluluğu aranmaz", () => {
    const base = emptyProjectFormValues();
    const errors = validateProjectForm(
      {
        ...base,
        projectType: "kendi_yatirim",
        basic: { ...base.basic, name: "Ada Rezidans", category: "Konut", city: "İzmir" },
      },
      { isDraft: false },
    );
    expect(hasErrors(errors)).toBe(false);
  });
});

describe("validateProjectForm — tutarlılık kuralları", () => {
  it("bitiş başlangıçtan önceyse hata verir", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      { ...values, contract: { ...values.contract, endDate: "2026-01-01" } },
      { isDraft: false },
    );
    expect(errors.contract.endDate).toBe("Bitiş tarihi başlangıçtan önce olamaz.");
  });

  it("yüzde 0-100 dışındaysa hata verir", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      { ...values, contract: { ...values.contract, advancePct: "120" } },
      { isDraft: false },
    );
    expect(errors.contract.advancePct).toBe("Oran 0 ile 100 arasında olmalıdır.");
  });

  it("negatif tutar hata verir", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      { ...values, budget: { ...values.budget, material: "-5" } },
      { isDraft: false },
    );
    expect(errors.budget.material).toBe("Tutar negatif olamaz.");
  });

  it("sözleşme bedeli sayı değilse hata verir", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      { ...values, contract: { ...values.contract, amount: "yirmi milyon" } },
      { isDraft: false },
    );
    expect(errors.contract.amount).toBe("Sözleşme bedeli sayı olmalıdır.");
  });

  it("adı boş ama dolu şantiye satırı hata verir", () => {
    const errors = validateProjectForm(
      withValues({
        sites: [{ id: "site-1", name: "", siteManagerName: "", constructionAreaM2: "6420" }],
      }),
      { isDraft: true },
    );
    expect(errors.sites[0]).toBe("Şantiye adı zorunludur.");
  });
});

describe("validateProjectForm — taslak semantiği (§5.2)", () => {
  it("taslakta yalnız ad zorunlu; diğer zorunluluklar atlanır", () => {
    const errors = validateProjectForm(emptyProjectFormValues(), { isDraft: true });
    expect(errors.basic.name).toBe("Proje adı zorunludur.");
    expect(errors.basic.city).toBeUndefined();
    expect(errors.basic.category).toBeUndefined();
    expect(errors.employer).toBeUndefined();
    expect(errors.contract).toEqual({});
  });

  it("taslakta tutarlılık kuralları YİNE uygulanır", () => {
    const base = emptyProjectFormValues();
    const errors = validateProjectForm(
      {
        ...base,
        basic: { ...base.basic, name: "Taslak Proje" },
        contract: {
          ...base.contract,
          startDate: "2026-05-01",
          endDate: "2026-04-01",
          advancePct: "-1",
        },
        budget: { ...base.budget, labor: "-10" },
      },
      { isDraft: true },
    );
    expect(errors.contract.endDate).toBe("Bitiş tarihi başlangıçtan önce olamaz.");
    expect(errors.contract.advancePct).toBe("Oran 0 ile 100 arasında olmalıdır.");
    expect(errors.budget.labor).toBe("Tutar negatif olamaz.");
  });
});

describe("taxNumberError (§4.10)", () => {
  it("boş VKN geçerli", () => {
    expect(taxNumberError("")).toBeUndefined();
  });

  it("10 ve 11 hane geçerli", () => {
    expect(taxNumberError("1234567890")).toBeUndefined();
    expect(taxNumberError("12345678901")).toBeUndefined();
  });

  it("kısa veya harfli VKN mesaj verir", () => {
    expect(taxNumberError("123")).toBe("VKN 10 veya 11 haneli rakam olmalıdır.");
    expect(taxNumberError("12345abcde")).toBe("VKN 10 veya 11 haneli rakam olmalıdır.");
  });
});

describe("buildProjectCreateBody (§3.3)", () => {
  it("taahhüt gövdesi: employer_id + contract + proje tarihleri", () => {
    const body = buildProjectCreateBody(validContracting(), false);
    expect(body.is_draft).toBe(false);
    expect(body.employer_id).toBe("emp-1");
    expect(body.contract?.contract_no).toBe("SZL-2026-005");
    expect(body.contract?.amount).toBe(22400000);
    expect(body.start_date).toBe("2026-02-01");
    expect(body.end_date).toBe("2027-11-01");
    // Gövdede employer_name yok (artık FK).
    expect("employer_name" in body).toBe(false);
  });

  it("fiyat farkı kapalıyken endeks alanları null gönderilir", () => {
    const values = validContracting();
    const body = buildProjectCreateBody(
      { ...values, contract: { ...values.contract, hasPriceEscalation: false } },
      false,
    );
    expect(body.contract?.index_type).toBeNull();
    expect(body.contract?.base_index_value).toBeNull();
  });

  it("taahhüt dışı tipte contract ve employer_id hiç gönderilmez (§3.6/7)", () => {
    const values = validContracting();
    const body = buildProjectCreateBody({ ...values, projectType: "kat_karsiligi" }, false);
    expect("contract" in body).toBe(false);
    expect("employer_id" in body).toBe(false);
  });

  it("kendi yatırım tipinde investment gönderilir", () => {
    const values = validContracting();
    const body = buildProjectCreateBody(
      {
        ...values,
        projectType: "kendi_yatirim",
        investment: { salesTarget: "5000000", landCost: "1200000" },
      },
      false,
    );
    expect(body.investment).toEqual({ sales_target: 5000000, land_cost: 1200000 });
  });

  it("boş bütçe kalemleri 0, boş şantiye satırları atılır", () => {
    const body = buildProjectCreateBody(
      withValues({ basic: { ...emptyProjectFormValues().basic, name: "X" } }),
      true,
    );
    expect(body.budget_lines).toEqual({
      material: 0,
      labor: 0,
      subcontractor: 0,
      overhead: 0,
    });
    expect(body.sites).toEqual([]);
    expect(body.is_draft).toBe(true);
  });
});

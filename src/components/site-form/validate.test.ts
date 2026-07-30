import { describe, it, expect } from "vitest";

import { emptySiteFormValues, type SiteFormValues } from "./form-state";
import { MESSAGES, hasSiteFormErrors, validateSiteForm } from "./validate";

function values(overrides: Partial<SiteFormValues> = {}): SiteFormValues {
  return { ...emptySiteFormValues(), ...overrides };
}

/** Zorunlu alanların hepsi dolu bir taban — tek tek boşaltarak sınanır. */
function complete(overrides: Partial<SiteFormValues> = {}): SiteFormValues {
  return values({
    name: "C-Blok Şantiyesi",
    siteManagerUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    city: "Çankaya / Ankara",
    constructionAreaM2: "6420",
    startDate: "2026-01-01",
    endDate: "2026-06-01",
    ...overrides,
  });
}

function validate(v: SiteFormValues, isDraft = false, isUserListUnavailable = false) {
  return validateSiteForm(v, { isDraft, isUserListUnavailable });
}

describe("validateSiteForm — zorunlu alanlar (spec §10.1)", () => {
  it("santiye adi bosken 'Santiye adi zorunludur.' verir", () => {
    expect(validate(complete({ name: "  " })).name).toBe(MESSAGES.nameRequired);
  });

  it("santiye sefi secilmemisken 'Santiye sefi seciniz.' verir", () => {
    expect(validate(complete({ siteManagerUserId: "" })).siteManagerUserId).toBe(
      MESSAGES.chiefRequired,
    );
  });

  it("il/ilce bosken 'Il / ilce zorunludur.' verir", () => {
    expect(validate(complete({ city: "" })).city).toBe(MESSAGES.cityRequired);
  });

  it("insaat alani bosken 'Insaat alani zorunludur.' verir", () => {
    expect(validate(complete({ constructionAreaM2: "" })).constructionAreaM2).toBe(
      MESSAGES.constructionAreaRequired,
    );
  });

  it("baslangic tarihi bosken 'Baslangic tarihi zorunludur.' verir", () => {
    expect(validate(complete({ startDate: "" })).startDate).toBe(MESSAGES.startDateRequired);
  });

  it("planlanan bitis bosken 'Planlanan bitis tarihi zorunludur.' verir", () => {
    expect(validate(complete({ endDate: "" })).endDate).toBe(MESSAGES.endDateRequired);
  });

  it("tum zorunlular doluyken hic hata yoktur", () => {
    expect(hasSiteFormErrors(validate(complete()))).toBe(false);
  });

  it("ISG Uzmani zorunlu DEGILDIR", () => {
    expect(validate(complete({ safetyOfficer: "" })).safetyOfficer).toBeUndefined();
  });

  it("arsa alani, mahalle, ada/parsel, adres, kat sayisi ve butce zorunlu DEGILDIR", () => {
    const errors = validate(complete());
    expect(errors.landAreaM2).toBeUndefined();
    expect(errors.neighborhood).toBeUndefined();
    expect(errors.parcel).toBeUndefined();
    expect(errors.address).toBeUndefined();
    expect(errors.floorInfo).toBeUndefined();
    expect(errors.budget).toBeUndefined();
  });
});

describe("validateSiteForm — 403 istisnasi (spec §10.1.1)", () => {
  it("kullanici listesi yuklenemediginde (403) sef zorunlulugu kalkar", () => {
    const errors = validate(complete({ siteManagerUserId: "" }), false, true);
    expect(errors.siteManagerUserId).toBeUndefined();
    expect(hasSiteFormErrors(errors)).toBe(false);
  });

  it("kullanici listesi geldiginde sef zorunlulugu aynen isler", () => {
    expect(validate(complete({ siteManagerUserId: "" }), false, false).siteManagerUserId).toBe(
      MESSAGES.chiefRequired,
    );
  });

  it("403 yalniz sefi gevsetir, diger zorunluluklar aynen isler", () => {
    const errors = validate(values({ name: "A" }), false, true);
    expect(errors.city).toBe(MESSAGES.cityRequired);
    expect(errors.constructionAreaM2).toBe(MESSAGES.constructionAreaRequired);
    expect(errors.startDate).toBe(MESSAGES.startDateRequired);
  });
});

describe("validateSiteForm — tutarlilik kurallari (spec §10.3)", () => {
  it("GPS icin hicbir dogrulama kurali yoktur", () => {
    for (const gps of ["kuzey kapı", "39.9042, 32.8597", "!!!", "41.0082N 28.9784E"]) {
      expect(validate(complete({ gpsCoordinates: gps })).gpsCoordinates).toBeUndefined();
    }
  });

  it("bitis < baslangic 'Planlanan bitis tarihi baslangictan once olamaz.' verir", () => {
    expect(
      validate(complete({ startDate: "2026-06-01", endDate: "2026-01-01" })).endDate,
    ).toBe(MESSAGES.endBeforeStart);
  });

  it("negatif deger 'Deger negatif olamaz.' verir", () => {
    expect(validate(complete({ landAreaM2: "-1" })).landAreaM2).toBe(MESSAGES.negativeValue);
    expect(validate(complete({ budget: "-5" })).budget).toBe(MESSAGES.negativeValue);
    expect(validate(complete({ plannedWorkerCount: "-3" })).plannedWorkerCount).toBe(
      MESSAGES.negativeValue,
    );
  });

  it("sayi alanina metin 'Bu alan sayi olmalidir.' verir", () => {
    expect(validate(complete({ landAreaM2: "abc" })).landAreaM2).toBe(MESSAGES.notANumber);
  });

  it("isci sayisi ondalikli 'Isci sayisi tam sayi olmalidir.' verir", () => {
    expect(validate(complete({ plannedWorkerCount: "4.5" })).plannedWorkerCount).toBe(
      MESSAGES.workerCountInteger,
    );
  });
});

describe("validateSiteForm — taslakta gevseyen kurallar (spec §10.2)", () => {
  it("taslakta yalniz ad zorunlu, digerleri atlanir", () => {
    const errors = validate(values({ name: "C-Blok" }), true);
    expect(hasSiteFormErrors(errors)).toBe(false);
  });

  it("taslakta ad bosken yine hata verir", () => {
    expect(validate(values(), true).name).toBe(MESSAGES.nameRequired);
  });

  it("taslakta tarih sirasi kurali UYGULANIR", () => {
    expect(
      validate(values({ name: "A", startDate: "2026-06-01", endDate: "2026-01-01" }), true)
        .endDate,
    ).toBe(MESSAGES.endBeforeStart);
  });

  it("taslakta negatif deger kurali UYGULANIR", () => {
    expect(validate(values({ name: "A", budget: "-1" }), true).budget).toBe(
      MESSAGES.negativeValue,
    );
  });
});

describe("MESSAGES — metin envanteri (spec §15/82, §10.3)", () => {
  it("kismi basari mesaji YOKTUR", () => {
    const all = Object.values(MESSAGES).join(" ");
    expect(all).not.toMatch(/bölüm eklenemedi/i);
    expect(all).not.toMatch(/ancak/i);
  });

  it("409 mesaji spec §10.3'ten birebir gelir", () => {
    expect(MESSAGES.siteCodeConflict).toBe(
      "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.",
    );
  });
});

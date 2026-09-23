/**
 * 🔴 KUSUR: proje-formu-tr-sayi-sessiz-sifir
 *
 * `form-state.ts` `numberOrZero()` sayıya çevrilemeyen bütçe kalemini SESSİZCE
 * `0` yapar. İstemci kapısı (`validate.ts` `moneyError`) yalnız NEGATİF değeri
 * yakalıyordu; sunucu `0`'ı geçerli sayar (`ProjectBudgetInput.* ge=0`,
 * default `0`) ve bütçe `ProjectUpdate`te TAŞINMADIĞI için sıfırlanan bütçe
 * hiçbir ekrandan düzeltilemez. Kullanıcı listelerde gördüğü tr-TR biçimini
 * ("12.480.000") geri yazdığında proje `budget_material = 0` ile açılır ve
 * Maliyet/Kâr ekranı kârı o tutar kadar yüksek gösterir.
 *
 * Tek doğru kapı İSTEMCİDEDİR: 0 sunucu için geçerli bir değerdir.
 */

import { describe, it, expect } from "vitest";

import {
  buildProjectCreateBody,
  emptyProjectFormValues,
  type ProjectFormValues,
} from "./form-state";
import { hasErrors, validateProjectForm } from "./validate";

const NOT_A_NUMBER = "Bu alan sayı olmalıdır.";

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

describe("bütçe kalemleri — sayıya çevrilemeyen giriş sessizce 0 OLMAMALI", () => {
  /** Her satır: kullanıcının gerçekten yazabileceği bir metin. */
  const CASES: readonly [string, string][] = [
    ["tr-TR binlik ayraçlı (listelerde görülen biçim)", "12.480.000"],
    ["tek binlik ayraçlı — Number() SONLU döner (6,42)", "6.420"],
    ["harfle yazılmış tutar", "on iki milyon"],
    ["tr-TR ondalık virgül", "1.235,50"],
    ["boş olmayan çöp", "abc"],
  ];

  it.each(CASES)("%s: '%s' → material hatası", (_ad, girdi) => {
    const values = validContracting();
    const errors = validateProjectForm(
      { ...values, budget: { ...values.budget, material: girdi } },
      { isDraft: false },
    );
    expect(errors.budget.material).toBe(NOT_A_NUMBER);
    // Gönderim kapısı: hata varken ProjectCreateView mutate ETMEZ (:157).
    expect(hasErrors(errors)).toBe(true);
  });

  it("dört kalemin DÖRDÜ de kapalı", () => {
    const values = validContracting();
    const errors = validateProjectForm(
      {
        ...values,
        budget: {
          material: "12.480.000",
          labor: "5.840.000",
          subcontractor: "3.120.000",
          overhead: "420.000",
        },
      },
      { isDraft: false },
    );
    expect(errors.budget.material).toBe(NOT_A_NUMBER);
    expect(errors.budget.labor).toBe(NOT_A_NUMBER);
    expect(errors.budget.subcontractor).toBe(NOT_A_NUMBER);
    expect(errors.budget.overhead).toBe(NOT_A_NUMBER);
  });

  it("TASLAK yolunda da kapalı (tutarlılık kuralı, §5.2)", () => {
    const base = emptyProjectFormValues();
    const errors = validateProjectForm(
      {
        ...base,
        basic: { ...base.basic, name: "Taslak Proje" },
        budget: { ...base.budget, labor: "5.840.000" },
      },
      { isDraft: true },
    );
    expect(errors.budget.labor).toBe(NOT_A_NUMBER);
  });

  it("aynı kapı yatırım ve arsa payı para alanlarını da korur", () => {
    const base = emptyProjectFormValues();
    const yatirim = validateProjectForm(
      {
        ...base,
        basic: { ...base.basic, name: "X", category: "Konut", city: "İstanbul" },
        projectType: "kendi_yatirim",
        investment: { salesTarget: "45.000.000", landCost: "12.000.000" },
      },
      { isDraft: false },
    );
    expect(yatirim.investment.salesTarget).toBe(NOT_A_NUMBER);
    expect(yatirim.investment.landCost).toBe(NOT_A_NUMBER);

    const arsa = validateProjectForm(
      {
        ...base,
        basic: { ...base.basic, name: "X", category: "Konut", city: "İstanbul" },
        projectType: "kat_karsiligi",
        landShare: {
          ...base.landShare,
          ourSharePct: "45",
          ownerSharePct: "55",
          guaranteeAmount: "1.200.000",
          dailyPenalty: "12.500",
        },
      },
      { isDraft: false },
    );
    expect(arsa.landShare.guaranteeAmount).toBe(NOT_A_NUMBER);
    expect(arsa.landShare.dailyPenalty).toBe(NOT_A_NUMBER);
  });

  it("gövde kurucusu bu girdiyi HÂLÂ 0'a çevirir — kapı yalnız doğrulamadır", () => {
    const values = validContracting();
    const body = buildProjectCreateBody(
      { ...values, budget: { ...values.budget, material: "12.480.000" } },
      false,
    );
    // Kanıt: doğrulama kapısı kalkarsa kayıp geri döner (mutasyon kanıtı).
    expect(body.budget_lines?.material).toBe(0);
  });
});

describe("geçerli para girdileri BOZULMAZ (gerileme)", () => {
  function budgetErrors(material: string) {
    const values = validContracting();
    return validateProjectForm(
      { ...values, budget: { ...values.budget, material } },
      { isDraft: false },
    ).budget.material;
  }

  it("düz rakam, ondalık nokta, sıfır ve boş geçerli", () => {
    expect(budgetErrors("12480000")).toBeUndefined();
    expect(budgetErrors("12480000.75")).toBeUndefined();
    expect(budgetErrors("0.500")).toBeUndefined();
    expect(budgetErrors("0")).toBeUndefined();
    expect(budgetErrors("")).toBeUndefined();
    expect(budgetErrors("  ")).toBeUndefined();
  });

  it("negatif mesajı §4.10'daki metin olarak KALIR", () => {
    expect(budgetErrors("-5")).toBe("Tutar negatif olamaz.");
  });

  it("baz endeks değeri '1.000' para alanı DEĞİL — geçerli kalır", () => {
    const values = validContracting();
    const errors = validateProjectForm(values, { isDraft: false });
    expect(errors.contract.baseIndexValue).toBeUndefined();
    expect(hasErrors(errors)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";

import { buildPersonnelCreateBody, submittableValues } from "./build-body";
import { emptyPersonnelFormValues } from "./form-state";

/**
 * 🔒 GÖVDE SIZINTISI KAPISI (şef emri).
 *
 * `PersonnelCreate` `additionalProperties: false` taşır: gövdeye fazladan tek
 * anahtar girerse sunucu 422 döner. Mockup'ta 25'e yakın alan var, sunucuda
 * dört. Bu dosya gövdenin anahtar kümesini TAM OLARAK iddia eder — yeni bir
 * alan sızarsa test kırmızı olur.
 */
function fullyFilled() {
  return {
    ...emptyPersonnelFormValues(),
    firstName: "Mehmet",
    lastName: "Yılmaz",
    source: "subcontractor" as const,
    subcontractorId: "sub-1",
    trade: "Elektrikçi",
  };
}

describe("buildPersonnelCreateBody — gövde sızıntısı", () => {
  it("form TÜMÜYLE doldurulduğunda bile gövde YALNIZ sözleşmedeki anahtarları taşır", () => {
    const body = buildPersonnelCreateBody(fullyFilled());

    // Anahtar kümesi TAM olarak iddia edilir (fazlası da eksiği de kırmızı).
    expect(Object.keys(body).sort()).toEqual([
      "full_name",
      "is_active",
      "source",
      "subcontractor_id",
      "trade",
    ]);
    expect(body).toEqual({
      full_name: "Mehmet Yılmaz",
      trade: "Elektrikçi",
      source: "subcontractor",
      subcontractor_id: "sub-1",
      is_active: true,
    });
  });

  it("şirket kadrosunda subcontractor_id anahtarı HİÇ basılmaz", () => {
    const body = buildPersonnelCreateBody({ ...fullyFilled(), source: "company" });
    expect(Object.keys(body).sort()).toEqual(["full_name", "is_active", "source", "trade"]);
    expect("subcontractor_id" in body).toBe(false);
  });

  it("taşerondan şirket kadrosuna dönülse bile eski taşeron kimliği SIZMAZ", () => {
    // Görünüm seçimi zaten temizler; bu ikinci koruma derleyici katmanındadır.
    const body = buildPersonnelCreateBody({
      ...fullyFilled(),
      source: "company",
      subcontractorId: "sub-1",
    });
    expect("subcontractor_id" in body).toBe(false);
  });

  it("mockup'ın devre-dışı alanlarının form durumunda karşılığı bile yoktur", () => {
    // Değer tutulmayan alan gövdeye sızamaz — koruma burada başlar.
    expect(Object.keys(emptyPersonnelFormValues()).sort()).toEqual([
      "firstName",
      "lastName",
      "source",
      "subcontractorId",
      "trade",
    ]);
  });

  it("ad ve soyad tek full_name'e birleşir, kenar boşlukları kırpılır", () => {
    const body = buildPersonnelCreateBody({
      ...fullyFilled(),
      firstName: "  Ayşe ",
      lastName: " Demir  ",
    });
    expect(body.full_name).toBe("Ayşe Demir");
  });

  it("boş meslek seçimi trade: null'a düşer (boş dize gönderilmez)", () => {
    const body = buildPersonnelCreateBody({ ...fullyFilled(), trade: "   " });
    expect(body.trade).toBeNull();
  });
});

describe("submittableValues", () => {
  it("çalışan tipi seçilmemişse null döner (sessiz varsayılana DÜŞMEZ)", () => {
    expect(submittableValues(emptyPersonnelFormValues())).toBeNull();
  });

  it("seçim varsa daraltılmış değerleri döner", () => {
    expect(submittableValues(fullyFilled())?.source).toBe("subcontractor");
  });
});

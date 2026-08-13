import { describe, it, expect } from "vitest";

import { buildPersonnelCreateBody, buildPersonnelUpdateBody, submittableValues } from "./build-body";
import { emptyPersonnelFormValues } from "./form-state";

/**
 * 🔒 GÖVDE SIZINTISI KAPISI (şef emri).
 *
 * İki gövde de `additionalProperties: false` taşır: fazladan tek anahtar 422
 * demektir. Bu dosya gövdenin anahtar kümesini TAM OLARAK iddia eder — yeni
 * bir alan sızarsa (or. `assigned_section_id`, `user_id`) test kırmızı olur.
 */
function fullyFilled() {
  return {
    ...emptyPersonnelFormValues(),
    firstName: "Mehmet",
    lastName: "Yılmaz",
    source: "subcontractor" as const,
    subcontractorId: "sub-1",
    trade: "Elektrikçi",
    tcNo: "12345678901",
    birthDate: "1985-04-12",
    gender: "male" as const,
    maritalStatus: "married" as const,
    phone: "0532 123 45 67",
    email: "mehmet@example.com",
    address: "Cumhuriyet Mah. 12/3 Ankara",
    emergencyContactName: "Ayşe Yılmaz",
    emergencyContactPhone: "0533 987 65 43",
    hireDate: "2026-08-01",
    assignedProjectId: "p-1",
    wageAmount: "1200",
    iban: "TR120001009300123456789",
    sgkNo: "12345678900",
  };
}

/** Create gövdesinin TAM anahtar kümesi (taşeron seçiliyken). */
const CREATE_KEYS = [
  "address",
  "assigned_project_id",
  "birth_date",
  "email",
  "emergency_contact_name",
  "emergency_contact_phone",
  "full_name",
  "gender",
  "hire_date",
  "iban",
  "is_active",
  "is_draft",
  "marital_status",
  "payment_method",
  "phone",
  "sgk_no",
  "source",
  "subcontractor_id",
  "tc_no",
  "trade",
  "wage_amount",
  "wage_type",
];

describe("buildPersonnelCreateBody — gövde sızıntısı", () => {
  it("form TÜMÜYLE doldurulduğunda bile gövde YALNIZ sözleşmedeki anahtarları taşır", () => {
    const body = buildPersonnelCreateBody(fullyFilled(), { isDraft: false });

    // Anahtar kümesi TAM olarak iddia edilir (fazlası da eksiği de kırmızı).
    expect(Object.keys(body).sort()).toEqual([...CREATE_KEYS].sort());
    expect(body).toEqual({
      full_name: "Mehmet Yılmaz",
      trade: "Elektrikçi",
      source: "subcontractor",
      subcontractor_id: "sub-1",
      is_active: true,
      is_draft: false,
      tc_no: "12345678901",
      birth_date: "1985-04-12",
      gender: "male",
      marital_status: "married",
      phone: "0532 123 45 67",
      email: "mehmet@example.com",
      address: "Cumhuriyet Mah. 12/3 Ankara",
      emergency_contact_name: "Ayşe Yılmaz",
      emergency_contact_phone: "0533 987 65 43",
      hire_date: "2026-08-01",
      wage_type: "daily",
      wage_amount: "1200",
      payment_method: "bank",
      iban: "TR120001009300123456789",
      sgk_no: "12345678900",
      assigned_project_id: "p-1",
    });
  });

  it("Bölüm ve kullanıcı bağı gövdeye ASLA girmez (seçilemeyen alan yazılmaz)", () => {
    const body = buildPersonnelCreateBody(fullyFilled(), { isDraft: false });
    expect("assigned_section_id" in body).toBe(false);
    expect("user_id" in body).toBe(false);
  });

  it("şirket kadrosunda subcontractor_id anahtarı HİÇ basılmaz", () => {
    const body = buildPersonnelCreateBody(
      { ...fullyFilled(), source: "company" },
      { isDraft: false },
    );
    expect("subcontractor_id" in body).toBe(false);
  });

  it("taşerondan şirket kadrosuna dönülse bile eski taşeron kimliği SIZMAZ", () => {
    // Görünüm seçimi zaten temizler; bu ikinci koruma derleyici katmanındadır.
    const body = buildPersonnelCreateBody(
      { ...fullyFilled(), source: "company", subcontractorId: "sub-1" },
      { isDraft: false },
    );
    expect("subcontractor_id" in body).toBe(false);
  });

  it("is_draft ÇAĞIRANDAN gelir — taslak düğmesi true, yayın düğmesi false", () => {
    expect(buildPersonnelCreateBody(fullyFilled(), { isDraft: true }).is_draft).toBe(true);
    expect(buildPersonnelCreateBody(fullyFilled(), { isDraft: false }).is_draft).toBe(false);
  });

  it("ad ve soyad tek full_name'e birleşir, kenar boşlukları kırpılır", () => {
    const body = buildPersonnelCreateBody(
      { ...fullyFilled(), firstName: "  Ayşe ", lastName: " Demir  " },
      { isDraft: false },
    );
    expect(body.full_name).toBe("Ayşe Demir");
  });

  it("boş metin alanları null'a düşer (boş dize gönderilmez)", () => {
    const body = buildPersonnelCreateBody(
      { ...fullyFilled(), trade: "   ", tcNo: "  ", iban: "", address: " " },
      { isDraft: false },
    );
    expect(body.trade).toBeNull();
    expect(body.tc_no).toBeNull();
    expect(body.iban).toBeNull();
    expect(body.address).toBeNull();
  });

  it("seçilmemiş cinsiyet/medeni durum null gider (boş dize DEĞİL)", () => {
    const body = buildPersonnelCreateBody(
      { ...fullyFilled(), gender: "", maritalStatus: "" },
      { isDraft: false },
    );
    expect(body.gender).toBeNull();
    expect(body.marital_status).toBeNull();
  });

  it("boş taslakta bile sözleşmenin zorunlu ikilisi doludur", () => {
    const body = buildPersonnelCreateBody(
      { ...emptyPersonnelFormValues(), firstName: "Zeki", source: "company" as const },
      { isDraft: true },
    );
    expect(body.full_name).toBe("Zeki");
    expect(body.source).toBe("company");
    expect(body.is_draft).toBe(true);
    expect(body.tc_no).toBeNull();
  });
});

describe("form durumunun alan kümesi", () => {
  it("sunucu sözleşmesinde karşılığı OLMAYAN hiçbir alan durumda tutulmaz", () => {
    // Değer tutulmayan alan gövdeye sızamaz — koruma burada başlar. Fotoğraf,
    // belgeler, SGK bildirge kutucuğu ve **Bölüm** bilerek YOKTUR.
    expect(Object.keys(emptyPersonnelFormValues()).sort()).toEqual([
      "address",
      "assignedProjectId",
      "birthDate",
      "email",
      "emergencyContactName",
      "emergencyContactPhone",
      "firstName",
      "gender",
      "hireDate",
      "iban",
      "isActive",
      "lastName",
      "maritalStatus",
      "paymentMethod",
      "phone",
      "sgkNo",
      "source",
      "subcontractorId",
      "tcNo",
      "trade",
      "wageAmount",
      "wageType",
    ]);
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

/**
 * 🔒 GÖVDE SIZINTISI KAPISI — PATCH (F-PT2 T3 + F-İK T4 şef emri).
 */
describe("buildPersonnelUpdateBody — gövde sızıntısı", () => {
  it("gövde create ile AYNI alanları taşır; is_draft yalnız istendiğinde eklenir", () => {
    const body = buildPersonnelUpdateBody(
      { ...fullyFilled(), isActive: false },
      { isDraft: null },
    );

    expect(Object.keys(body).sort()).toEqual(
      CREATE_KEYS.filter((key) => key !== "is_draft").sort(),
    );
    expect(body.is_active).toBe(false);
    expect("is_draft" in body).toBe(false);
  });

  it("şirket kadrosuna dönülünce subcontractor_id AÇIKÇA null gider (PATCH kısmi güncelleme tuzağı)", () => {
    // Anahtar HİÇ gönderilmezse sunucu eski taşeron kimliğini SESSİZCE
    // korurdu — bu yüzden create'in aksine burada anahtar HER ZAMAN basılır.
    const body = buildPersonnelUpdateBody({ ...fullyFilled(), source: "company" }, { isDraft: null });
    expect(body.subcontractor_id).toBeNull();
    expect("subcontractor_id" in body).toBe(true);
  });

  it("is_active formdaki değeri AYNEN taşır (sabit true DEĞİL)", () => {
    expect(
      buildPersonnelUpdateBody({ ...fullyFilled(), isActive: true }, { isDraft: null }).is_active,
    ).toBe(true);
    expect(
      buildPersonnelUpdateBody({ ...fullyFilled(), isActive: false }, { isDraft: null }).is_active,
    ).toBe(false);
  });

  it("YAYIN durumu ancak AÇIK istekle değişir (K4)", () => {
    // Düz "Kaydet": anahtar yok → sunucudaki durum korunur.
    expect("is_draft" in buildPersonnelUpdateBody(fullyFilled(), { isDraft: null })).toBe(false);
    // "Yayına Al": açıkça false.
    expect(buildPersonnelUpdateBody(fullyFilled(), { isDraft: false }).is_draft).toBe(false);
    // "Taslak Kaydet": açıkça true.
    expect(buildPersonnelUpdateBody(fullyFilled(), { isDraft: true }).is_draft).toBe(true);
  });

  it("Bölüm PATCH'te de gönderilmez — sunucudaki mevcut bölüm SİLİNMEZ", () => {
    const body = buildPersonnelUpdateBody(fullyFilled(), { isDraft: null });
    expect("assigned_section_id" in body).toBe(false);
  });

  it("boş meslek seçimi trade: null'a düşer", () => {
    expect(
      buildPersonnelUpdateBody({ ...fullyFilled(), trade: "   " }, { isDraft: null }).trade,
    ).toBeNull();
  });
});

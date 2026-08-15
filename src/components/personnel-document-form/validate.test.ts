import { describe, it, expect } from "vitest";

import { MAX_LENGTH, NO_PROJECT_UPLOAD_REASON, OTHER_TYPE_VALUE } from "./constants";
import {
  isIsoDate,
  validatePersonnelDocument,
  type PersonnelDocumentFormValues,
} from "./validate";

const TYPE_ID = "tttttttt-0000-0000-0000-000000000001";
const PROJECT_ID = "pppppppp-0000-0000-0000-000000000001";

function values(overrides: Partial<PersonnelDocumentFormValues> = {}): PersonnelDocumentFormValues {
  return {
    file: null,
    typeId: TYPE_ID,
    freeLabel: "",
    issuedAt: "",
    validUntil: "",
    note: "",
    ...overrides,
  };
}

const withProject = { projectId: PROJECT_ID, isFileUploaded: false };
const withoutProject = { projectId: null, isFileUploaded: false };

function pdf(name = "rapor.pdf"): File {
  return new File(["x"], name, { type: "application/pdf" });
}

describe("isIsoDate", () => {
  it("yalnız YYYY-AA-GG biçimini kabul eder", () => {
    expect(isIsoDate("2026-01-15")).toBe(true);
    expect(isIsoDate("15.01.2026")).toBe(false);
    expect(isIsoDate("2026-13-40")).toBe(false);
  });
});

describe("validatePersonnelDocument — XOR (`type_id` XOR `free_label`)", () => {
  it("tür seçilmemişse durur (ikisi de boş gövde 422 olurdu)", () => {
    expect(validatePersonnelDocument(values({ typeId: "" }), withProject)).toEqual({
      field: "typeId",
      message: 'Belge Türü seçin — listede yoksa "Diğer…" seçip serbest etiket yazın.',
    });
  });

  it('"Diğer…" seçiliyken serbest etiket boşsa durur', () => {
    expect(
      validatePersonnelDocument(values({ typeId: OTHER_TYPE_VALUE }), withProject),
    ).toEqual({
      field: "freeLabel",
      message: '"Diğer…" seçildiğinde Serbest Etiket zorunludur.',
    });
  });

  it('"Diğer…" + serbest etiket geçerlidir', () => {
    expect(
      validatePersonnelDocument(
        values({ typeId: OTHER_TYPE_VALUE, freeLabel: "Vinç Operatör Belgesi" }),
        withProject,
      ),
    ).toBeNull();
  });

  it("katalog tipi seçiliyken serbest etiketin dolu kalması ENGEL DEĞİLDİR (gövdeye girmez)", () => {
    // XOR yapısal olarak `build-body.ts`te kurulur; doğrulama kullanıcıyı
    // gereksiz yere durdurmaz.
    expect(
      validatePersonnelDocument(values({ freeLabel: "artık metin" }), withProject),
    ).toBeNull();
  });
});

describe("validatePersonnelDocument — dosya / proje kapısı", () => {
  it("dosya İSTEĞE BAĞLIdır: dosyasız kayıt geçerlidir", () => {
    expect(validatePersonnelDocument(values(), withoutProject)).toBeNull();
  });

  it("🔴 projesiz personelde dosya seçilirse DURUR ve gerekçe döner", () => {
    expect(validatePersonnelDocument(values({ file: pdf() }), withoutProject)).toEqual({
      field: "file",
      message: NO_PROJECT_UPLOAD_REASON,
    });
  });

  it("dosya zaten yüklendiyse proje aranmaz (ikinci adımın tekrarı)", () => {
    expect(
      validatePersonnelDocument(values({ file: pdf() }), {
        projectId: null,
        isFileUploaded: true,
      }),
    ).toBeNull();
  });
});

describe("validatePersonnelDocument — tarih ve not", () => {
  it("bozuk düzenlenme tarihi durur", () => {
    expect(validatePersonnelDocument(values({ issuedAt: "15/01/2026" }), withProject)).toEqual({
      field: "issuedAt",
      message: "Düzenlenme Tarihi geçerli bir tarih olmalıdır.",
    });
  });

  it("bozuk geçerlilik tarihi durur", () => {
    expect(validatePersonnelDocument(values({ validUntil: "2026-99-99" }), withProject)).toEqual({
      field: "validUntil",
      message: "Geçerlilik Bitiş Tarihi geçerli bir tarih olmalıdır.",
    });
  });

  it("boş geçerlilik tarihi geçerlidir (mockup 151)", () => {
    expect(validatePersonnelDocument(values({ validUntil: "" }), withProject)).toBeNull();
  });

  it("not tavanı aşılırsa durur (mockup 169)", () => {
    const problem = validatePersonnelDocument(
      values({ note: "a".repeat(MAX_LENGTH.note + 1) }),
      withProject,
    );
    expect(problem?.field).toBe("note");
  });
});

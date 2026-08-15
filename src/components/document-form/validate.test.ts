import { describe, it, expect } from "vitest";

import { MAX_LENGTH } from "./constants";
import { isIsoDate, validateArchiveDocument, validateEquipmentDocument } from "./validate";

const FILE = new File(["x"], "ruhsat.pdf", { type: "application/pdf" });

describe("validateEquipmentDocument (EKP · Form - Ekipman Belgesi)", () => {
  it("dosya seçilmeden geçmez — ilk hata DOSYADIR (mockup 86 `*`)", () => {
    expect(validateEquipmentDocument({ file: null, typeId: "t1", validUntil: "" })).toEqual({
      field: "file",
      message: "Bir dosya seçin.",
    });
  });

  it("belge türü zorunludur (mockup 100 `*`)", () => {
    expect(validateEquipmentDocument({ file: FILE, typeId: "", validUntil: "" })).toEqual({
      field: "typeId",
      message: "Belge Türü zorunludur.",
    });
  });

  it("geçerlilik tarihi BOŞ bırakılabilir (mockup 122 'süre takibi yapılmaz')", () => {
    expect(validateEquipmentDocument({ file: FILE, typeId: "t1", validUntil: "" })).toBeNull();
  });

  it("geçerlilik tarihi doluysa gerçek bir tarih olmalıdır", () => {
    expect(validateEquipmentDocument({ file: FILE, typeId: "t1", validUntil: "2026-13-40" })).toEqual(
      {
        field: "validUntil",
        message: "Geçerlilik Bitiş Tarihi geçerli bir tarih olmalıdır.",
      },
    );
    expect(
      validateEquipmentDocument({ file: FILE, typeId: "t1", validUntil: "2027-03-01" }),
    ).toBeNull();
  });
});

describe("isIsoDate", () => {
  it("yalnız YYYY-MM-DD kabul eder", () => {
    expect(isIsoDate("2026-08-15")).toBe(true);
    expect(isIsoDate("15.08.2026")).toBe(false);
    expect(isIsoDate("2026-08-15T00:00:00Z")).toBe(false);
  });
});

describe("validateArchiveDocument (ARŞ · Form - Belge Ekle)", () => {
  const base = { file: FILE, projectId: "p1", siteId: "", folderId: "", description: "" };

  it("dosya seçilmeden geçmez (mockup 73 `*`)", () => {
    expect(validateArchiveDocument({ ...base, file: null })).toEqual({
      field: "file",
      message: "Bir dosya seçin.",
    });
  });

  it("proje zorunludur (mockup 87 `*`)", () => {
    expect(validateArchiveDocument({ ...base, projectId: "" })).toEqual({
      field: "projectId",
      message: "Proje zorunludur.",
    });
  });

  it("şantiye/klasör/açıklama boş bırakılabilir (mockup 105 · 110 · 131)", () => {
    expect(validateArchiveDocument(base)).toBeNull();
  });

  it("açıklama 2000 karakteri aşamaz (mockup 133)", () => {
    const tooLong = "a".repeat(MAX_LENGTH.description + 1);
    expect(validateArchiveDocument({ ...base, description: tooLong })?.field).toBe("description");
    expect(
      validateArchiveDocument({ ...base, description: "a".repeat(MAX_LENGTH.description) }),
    ).toBeNull();
  });
});

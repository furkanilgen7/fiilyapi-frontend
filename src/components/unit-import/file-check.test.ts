import { describe, expect, it } from "vitest";

import { IMPORT_BAD_TYPE_MESSAGE, IMPORT_TOO_LARGE_MESSAGE } from "./constants";
import { checkImportFile, type ImportFileFacts } from "./file-check";

function file(overrides: Partial<ImportFileFacts> = {}): ImportFileFacts {
  return { name: "Yesilvadi_Uniteler_v3.xlsx", size: 248 * 1024, ...overrides };
}

describe("checkImportFile — 🔴 GUARD 6: uzantı", () => {
  it(".xlsx kabul edilir", () => {
    expect(checkImportFile(file())).toEqual({ ok: true });
  });

  it(".xls REDDEDİLİR — mesaj SUNUCUNUNKİDİR", () => {
    expect(checkImportFile(file({ name: "uniteler.xls" }))).toEqual({
      ok: false,
      message: IMPORT_BAD_TYPE_MESSAGE,
    });
  });

  it(".csv REDDEDİLİR (mockup EI 76 kabul eder — mockup YANLIŞTIR)", () => {
    expect(checkImportFile(file({ name: "uniteler.csv" }))).toEqual({
      ok: false,
      message: IMPORT_BAD_TYPE_MESSAGE,
    });
  });

  it("uzantı denetimi BÜYÜK/küçük harf duyarsızdır", () => {
    expect(checkImportFile(file({ name: "UNITELER.XLSX" })).ok).toBe(true);
    expect(checkImportFile(file({ name: "Uniteler.XlSx" })).ok).toBe(true);
  });

  it("uzantısız ad ve `.xlsx` içeren ama bitmeyen ad REDDEDİLİR", () => {
    expect(checkImportFile(file({ name: "uniteler" })).ok).toBe(false);
    expect(checkImportFile(file({ name: "uniteler.xlsx.zip" })).ok).toBe(false);
  });
});

describe("checkImportFile — 🔴 GUARD 6: boyut sınırı (N kabul / N+1 red)", () => {
  it("TAM 2 MB (2097152 bayt) KABUL edilir", () => {
    expect(checkImportFile(file({ size: 2097152 }))).toEqual({ ok: true });
  });

  it("2 MB + 1 bayt (2097153) REDDEDİLİR", () => {
    expect(checkImportFile(file({ size: 2097153 }))).toEqual({
      ok: false,
      message: IMPORT_TOO_LARGE_MESSAGE,
    });
  });

  it("sıfır baytlık dosya boyuttan DEĞİL, sunucudan reddedilir (ön kontrol geçer)", () => {
    expect(checkImportFile(file({ size: 0 })).ok).toBe(true);
  });
});

describe("checkImportFile — sıra", () => {
  it("yanlış tip + çok büyük dosyada ÖNCE tip söylenir (sunucu sırası)", () => {
    expect(checkImportFile({ name: "buyuk.csv", size: 9_000_000 })).toEqual({
      ok: false,
      message: IMPORT_BAD_TYPE_MESSAGE,
    });
  });
});

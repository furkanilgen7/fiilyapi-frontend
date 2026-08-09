import { describe, it, expect } from "vitest";

import { attachmentFilename, exportFilename } from "./export-filename";

const FALLBACK = "denetim-gunlugu.xlsx";

describe("exportFilename (spec §8.2)", () => {
  it("Content-Disposition'dan güvenli dosya adı çıkarır", () => {
    expect(exportFilename('attachment; filename="is-kalemleri-STE-01.xlsx"', FALLBACK)).toBe(
      "is-kalemleri-STE-01.xlsx",
    );
  });

  it("tırnaksız filename değerini de okur", () => {
    expect(exportFilename("attachment; filename=rapor.xlsx", FALLBACK)).toBe("rapor.xlsx");
  });

  it("başlık yoksa varsayılana düşer", () => {
    expect(exportFilename(null, FALLBACK)).toBe(FALLBACK);
  });

  it.each([
    ["yol ayracı", 'attachment; filename="../../etc/passwd.xlsx"'],
    ["ters yol ayracı", 'attachment; filename="..\\gizli.xlsx"'],
    ["kontrol karakteri", 'attachment; filename="rap\nor.xlsx"'],
    ["yanlış uzantı", 'attachment; filename="zararli.exe"'],
  ])("%s içeren adı reddeder ve varsayılana düşer", (_label, header) => {
    expect(exportFilename(header, FALLBACK)).toBe(FALLBACK);
  });

  // DRY: yardımcı artık iki çağıranın ortağı — varsayılan ad ÇAĞIRANDAN gelir,
  // modüle gömülü `denetim-gunlugu.xlsx` sabitine bağlı değildir (spec §8.2).
  it("varsayılan ad parametre olarak verilebilir", () => {
    expect(exportFilename(null, "is-kalemleri.xlsx")).toBe("is-kalemleri.xlsx");
  });
});

// F-BC T1 · belge arşivi indirmeleri — uzantı SABİT DEĞİLDİR (pdf/xlsx/dwg/
// zip/jpg…), bu yüzden `.xlsx` şartı koşan `exportFilename` kullanılamaz.
// Yol ayracı / kontrol karakteri reddi AYNEN korunur.
describe("attachmentFilename (F-BC)", () => {
  const FALLBACK_DOC = "belge";

  it.each([
    ['attachment; filename="proje-sozlesmesi.pdf"', "proje-sozlesmesi.pdf"],
    ["attachment; filename=metraj.xlsx", "metraj.xlsx"],
    ['attachment; filename="kat-plani-Rev3.dwg"', "kat-plani-Rev3.dwg"],
    ['attachment; filename="Ruhsat Örneği (2).jpg"', "Ruhsat Örneği (2).jpg"],
  ])("%s → %s", (header, expected) => {
    expect(attachmentFilename(header, FALLBACK_DOC)).toBe(expected);
  });

  it("başlık yoksa varsayılana düşer", () => {
    expect(attachmentFilename(null, FALLBACK_DOC)).toBe(FALLBACK_DOC);
  });

  it.each([
    ["yol ayracı", 'attachment; filename="../../etc/passwd.pdf"'],
    ["ters yol ayracı", 'attachment; filename="..\\gizli.pdf"'],
    ["kontrol karakteri", 'attachment; filename="rap\nor.pdf"'],
    ["uzantısız ad", 'attachment; filename="sadecead"'],
    ["boş ad", 'attachment; filename=""'],
  ])("%s içeren adı reddeder ve varsayılana düşer", (_label, header) => {
    expect(attachmentFilename(header, FALLBACK_DOC)).toBe(FALLBACK_DOC);
  });
});

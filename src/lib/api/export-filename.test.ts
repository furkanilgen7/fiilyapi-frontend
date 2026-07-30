import { describe, it, expect } from "vitest";

import { exportFilename } from "./export-filename";

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

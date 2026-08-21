import { describe, expect, it } from "vitest";

import {
  IMPORT_ACCEPT,
  IMPORT_BAD_TYPE_MESSAGE,
  IMPORT_COST_COLUMN_NOTE,
  IMPORT_EXPECTED_COLUMNS,
  IMPORT_FILE_HINT,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_SERVER_RECHECK_NOTE,
  IMPORT_TOO_LARGE_MESSAGE,
  IMPORT_TOO_MANY_ROWS_MESSAGE,
} from "./constants";

describe("🔴 EI 76/79 MOCKUP METNİ SUNUCUYLA ÇELİŞİR — ekran GERÇEĞİ yazar", () => {
  it("kabul edilen tek uzantı `.xlsx`tir (mockup `.xls`/`.csv` de yazar)", () => {
    expect(IMPORT_ACCEPT).toBe(".xlsx");
    expect(IMPORT_ACCEPT).not.toContain(".xls,");
    expect(IMPORT_ACCEPT).not.toContain(".csv");
  });

  it("sınır 2 MB'tır (mockup 10 MB yazar)", () => {
    expect(IMPORT_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(IMPORT_MAX_BYTES).toBe(2097152);
  });

  it("satır sınırı 1000'dir (mockup'ta HİÇ geçmez)", () => {
    expect(IMPORT_MAX_ROWS).toBe(1000);
  });

  it("ipucu metni ÜÇ sınırı da söyler — sessiz tuzak bırakmaz", () => {
    expect(IMPORT_FILE_HINT).toContain("XLSX");
    expect(IMPORT_FILE_HINT).toContain("2 MB");
    expect(IMPORT_FILE_HINT).toContain("1000");
    expect(IMPORT_FILE_HINT).not.toContain("CSV");
    expect(IMPORT_FILE_HINT).not.toContain("10 MB");
  });
});

describe("Hata metinleri `importer.py`den BİREBİR", () => {
  it("üç sınır mesajı da sunucunun kendi dizesidir", () => {
    expect(IMPORT_BAD_TYPE_MESSAGE).toBe("Yalnızca .xlsx dosyası yüklenebilir");
    expect(IMPORT_TOO_LARGE_MESSAGE).toBe("Dosya çok büyük (en fazla 2 MB)");
    expect(IMPORT_TOO_MANY_ROWS_MESSAGE).toBe("Dosyada en fazla 1000 satır olabilir");
  });
});

describe("EI 85 beklenen kolonlar — `importer.py::COLUMNS` ile BİREBİR", () => {
  it("on iki başlık, sunucunun SIRASIYLA", () => {
    expect([...IMPORT_EXPECTED_COLUMNS]).toEqual([
      "Blok",
      "Kat",
      "Ünite No",
      "Tür",
      "Oda Tipi",
      "Brüt m²",
      "Net m²",
      "Cephe",
      "Liste Fiyatı",
      "Rayiç Değer",
      "Maliyet",
      "Sahiplik",
    ]);
  });

  it("🔴 'Maliyet' burada GİRDİ olarak kabul edilir ama SAKLANMAZ — not bunu söyler", () => {
    expect(IMPORT_EXPECTED_COLUMNS).toContain("Maliyet");
    expect(IMPORT_COST_COLUMN_NOTE).toContain("saklanmaz");
  });
});

describe("İstemci ön kontrolü TEK savunma hattı DEĞİLDİR", () => {
  it("sunucunun yeniden kontrol ettiği yazılıdır", () => {
    expect(IMPORT_SERVER_RECHECK_NOTE).toContain("sunucu");
  });
});

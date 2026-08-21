import { describe, expect, it } from "vitest";

import {
  IMPORT_EMPTY_FILE_MESSAGE,
  IMPORT_NOTHING_IMPORTABLE_MESSAGE,
  IMPORT_SUMMARY_INCONSISTENT_MESSAGE,
} from "./constants";
import {
  checkImportSummary,
  deriveImportResultOutcome,
  deriveValidationOutcome,
  describeBlocksToCreate,
  filterImportRows,
  importFilterCounts,
  type UnitImportRowReport,
  type UnitImportSummary,
  type UnitImportValidation,
} from "./report";

function row(overrides: Partial<UnitImportRowReport> = {}): UnitImportRowReport {
  return {
    row: 2,
    status: "ok",
    unit_no: "C-11",
    block_name: "C",
    floor: "4",
    layout: "2+1",
    gross_area_m2: "112",
    list_price: "968200",
    messages: ["Hazır"],
    imported: false,
    ...overrides,
  };
}

/** EI 95-98 — mockup'ın kendi sayaçları. */
const MOCKUP_SUMMARY: UnitImportSummary = {
  total_rows: 24,
  valid: 22,
  warning: 1,
  error: 1,
};

const MOCKUP_ROWS: readonly UnitImportRowReport[] = [
  row({ row: 2 }),
  // EI 152-161 — HATA satırı, İKİ mesajlı
  row({
    row: 7,
    status: "error",
    unit_no: "C-6",
    layout: null,
    gross_area_m2: "0",
    messages: ["Oda Tipi boş", "Brüt m² sıfır olamaz"],
  }),
  // EI 164-173 — UYARI satırı
  row({
    row: 11,
    status: "warning",
    unit_no: "C-10",
    messages: ["Fiyat maliyetin altında (₺860K) — kontrol edin"],
  }),
];

function validation(overrides: Partial<UnitImportValidation> = {}): UnitImportValidation {
  return { summary: MOCKUP_SUMMARY, rows: [...MOCKUP_ROWS], blocks_to_create: [], ...overrides };
}

describe("filterImportRows — EI 110-112 sekmeleri", () => {
  it("'Tümü' hiçbir satırı düşürmez", () => {
    expect(filterImportRows(MOCKUP_ROWS, "all")).toHaveLength(3);
  });

  it("'Hatalı' yalnız `error` satırlarını verir", () => {
    const rows = filterImportRows(MOCKUP_ROWS, "error");
    expect(rows.map((item) => item.row)).toEqual([7]);
  });

  it("'Uyarılı' yalnız `warning` satırlarını verir — hatalılar UYARILI SAYILMAZ", () => {
    const rows = filterImportRows(MOCKUP_ROWS, "warning");
    expect(rows.map((item) => item.row)).toEqual([11]);
  });

  it("girdi dizisini MUTASYONA UĞRATMAZ", () => {
    const before = [...MOCKUP_ROWS];
    filterImportRows(before, "error");
    expect(before).toHaveLength(3);
  });
});

describe("importFilterCounts — EI 110-112 rozet sayıları ÖZETTEN gelir", () => {
  it("mockup sayaçları: Tümü 24 · Hatalı 1 · Uyarılı 1", () => {
    expect(importFilterCounts(MOCKUP_SUMMARY)).toEqual({ all: 24, error: 1, warning: 1 });
  });
});

describe("checkImportSummary — 🔴 GUARD 7: valid + warning + error === total_rows", () => {
  it("mockup özeti TUTARLIDIR (22 + 1 + 1 = 24)", () => {
    expect(checkImportSummary(MOCKUP_SUMMARY)).toEqual({ consistent: true, message: null });
  });

  it("tutmayan özet BİLDİRİLİR — sessizce çizilmez", () => {
    const bozuk: UnitImportSummary = { total_rows: 24, valid: 20, warning: 1, error: 1 };
    const check = checkImportSummary(bozuk);
    expect(check.consistent).toBe(false);
    expect(check.message).toBe(IMPORT_SUMMARY_INCONSISTENT_MESSAGE);
  });

  it("boş dosyanın özeti de tutarlıdır (0 + 0 + 0 = 0)", () => {
    expect(
      checkImportSummary({ total_rows: 0, valid: 0, warning: 0, error: 0 }).consistent,
    ).toBe(true);
  });
});

describe("deriveValidationOutcome — 🔴 GUARD 8: boş / tamamı hatalı dosya", () => {
  it("SIFIR satırlı dosya AÇIK bir sonuç üretir — boş başarı DEĞİL", () => {
    const outcome = deriveValidationOutcome(
      validation({ summary: { total_rows: 0, valid: 0, warning: 0, error: 0 }, rows: [] }),
      { includeWarnings: true },
    );
    expect(outcome.kind).toBe("empty");
    if (outcome.kind !== "empty") return;
    expect(outcome.message).toBe(IMPORT_EMPTY_FILE_MESSAGE);
    expect(outcome.serverWillReject).toBe(true);
  });

  it("HER SATIRI hatalı dosya AÇIK bir sonuç üretir ve sunucunun 422'si BEKLENİR", () => {
    const outcome = deriveValidationOutcome(
      validation({
        summary: { total_rows: 3, valid: 0, warning: 0, error: 3 },
        rows: [row({ status: "error" })],
      }),
      { includeWarnings: true },
    );
    expect(outcome.kind).toBe("nothing_importable");
    if (outcome.kind !== "nothing_importable") return;
    expect(outcome.message).toBe(IMPORT_NOTHING_IMPORTABLE_MESSAGE);
    // `import` docstring: hiç geçerli satır yoksa 422 — `created=0` ile 200
    // dönmek kullanıcının "aktarıldı" sanmasına yol açardı.
    expect(outcome.serverWillReject).toBe(true);
  });

  it("YALNIZ uyarılı satırlar varken 'uyarılıları da aktar' KAPALIYSA aktarılacak satır YOKTUR", () => {
    const payload = validation({
      summary: { total_rows: 2, valid: 0, warning: 2, error: 0 },
      rows: [row({ status: "warning" })],
    });
    expect(deriveValidationOutcome(payload, { includeWarnings: false }).kind).toBe(
      "nothing_importable",
    );
    const acik = deriveValidationOutcome(payload, { includeWarnings: true });
    expect(acik.kind).toBe("ready");
    if (acik.kind !== "ready") return;
    expect(acik.importableCount).toBe(2);
  });

  it("mockup dosyası hazırdır: 22 geçerli + 1 uyarılı = 23 satır aktarılır", () => {
    const outcome = deriveValidationOutcome(validation(), { includeWarnings: true });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") return;
    expect(outcome.importableCount).toBe(23);
    expect(outcome.serverWillReject).toBe(false);
  });

  it("uyarılılar hariç tutulunca EI 202'nin sayısı 22'dir", () => {
    const outcome = deriveValidationOutcome(validation(), { includeWarnings: false });
    expect(outcome.kind).toBe("ready");
    if (outcome.kind !== "ready") return;
    expect(outcome.importableCount).toBe(22);
  });

  it("TUTARSIZ özet 'hazır' sayılmaz — önce tutarsızlık bildirilir", () => {
    const outcome = deriveValidationOutcome(
      validation({ summary: { total_rows: 24, valid: 20, warning: 1, error: 1 } }),
      { includeWarnings: true },
    );
    expect(outcome.kind).toBe("inconsistent");
    if (outcome.kind !== "inconsistent") return;
    expect(outcome.message).toBe(IMPORT_SUMMARY_INCONSISTENT_MESSAGE);
  });
});

describe("🔴 GUARD 9: `messages` bir LİSTEDİR", () => {
  it("bir satırın iki mesajı AYRI AYRI korunur (EI 161)", () => {
    const hatali = filterImportRows(MOCKUP_ROWS, "error")[0];
    expect(hatali.messages).toEqual(["Oda Tipi boş", "Brüt m² sıfır olamaz"]);
    expect(hatali.messages).toHaveLength(2);
  });

  it("modül katmanı mesajları TEK METNE BİRLEŞTİRMEZ", () => {
    for (const item of filterImportRows(MOCKUP_ROWS, "all")) {
      expect(Array.isArray(item.messages)).toBe(true);
      for (const message of item.messages) {
        expect(message).not.toContain(" · ");
      }
    }
  });
});

describe("describeBlocksToCreate — sessiz sürpriz YASAK", () => {
  it("açılacak blok yoksa null", () => {
    expect(describeBlocksToCreate(validation())).toBeNull();
  });

  it("açılacak bloklar ADLARIYLA bildirilir", () => {
    expect(describeBlocksToCreate(validation({ blocks_to_create: ["D", "E"] }))).toEqual({
      count: 2,
      names: ["D", "E"],
    });
  });
});

describe("deriveImportResultOutcome — kısmi başarı AÇIKÇA basılır", () => {
  it("tamamı yazıldıysa `all_created`", () => {
    expect(
      deriveImportResultOutcome({
        summary: { total_rows: 22, valid: 22, warning: 0, error: 0 },
        created: 22,
        skipped: 0,
        blocks_created: 1,
        rows: [],
      }),
    ).toEqual({ kind: "all_created", created: 22, blocksCreated: 1 });
  });

  it("kısmi aktarımda atlanan satır sayısı DA basılır", () => {
    expect(
      deriveImportResultOutcome({
        summary: MOCKUP_SUMMARY,
        created: 22,
        skipped: 2,
        blocks_created: 0,
        rows: [],
      }),
    ).toEqual({ kind: "partial", created: 22, skipped: 2, blocksCreated: 0 });
  });

  it("🔴 `created=0` ile gelen 200 BEKLENMEYEN bir yanıttır ve BAŞARI sayılmaz", () => {
    const outcome = deriveImportResultOutcome({
      summary: { total_rows: 3, valid: 0, warning: 0, error: 3 },
      created: 0,
      skipped: 3,
      blocks_created: 0,
      rows: [],
    });
    expect(outcome.kind).toBe("nothing_created");
    if (outcome.kind !== "nothing_created") return;
    expect(outcome.message).toBe(IMPORT_NOTHING_IMPORTABLE_MESSAGE);
  });
});

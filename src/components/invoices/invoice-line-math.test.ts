// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  buildLines,
  emptyLineDraft,
  isBlankLine,
  lineTotal,
  parseNumeric,
  type InvoiceLineDraft,
} from "./invoice-line-math";

function draft(over: Partial<InvoiceLineDraft>): InvoiceLineDraft {
  return { ...emptyLineDraft("k"), ...over };
}

/** FK:177-212 kalem tablosunun DÖRT satırı — mockup'ın kendi rakamları. */
const MOCKUP_LINES: InvoiceLineDraft[] = [
  draft({ key: "1", description: "Kat Döşemesi Betonu C25/30", unit: "m³", quantity: "1320", unitPrice: "2113" }),
  draft({ key: "2", description: "Kolon Betonu C30/37", unit: "m³", quantity: "300", unitPrice: "2398" }),
  draft({ key: "3", description: "Nervürlü Demir", unit: "Ton", quantity: "61.2", unitPrice: "21500" }),
  draft({ key: "4", description: "Döşeme Kalıbı", unit: "m²", quantity: "2880", unitPrice: "211" }),
];

describe("lineTotal — mockup rakamlarıyla DOĞRULANMIŞ hesap", () => {
  it("dört satırın tutarı FK:183/192/201/210 ile birebir tutar", () => {
    expect(MOCKUP_LINES.map(lineTotal)).toEqual([2_789_160, 719_400, 1_315_800, 607_680]);
  });

  it("miktarı ya da fiyatı okunamayan satır `null` döner — `0` DEĞİL", () => {
    expect(lineTotal(draft({ quantity: "", unitPrice: "10" }))).toBeNull();
    expect(lineTotal(draft({ quantity: "5", unitPrice: "" }))).toBeNull();
    expect(lineTotal(draft({ quantity: "abc", unitPrice: "10" }))).toBeNull();
  });

  it("virgüllü ondalık kabul edilir (tr-TR klavye)", () => {
    expect(lineTotal(draft({ quantity: "1,5", unitPrice: "100" }))).toBe(150);
  });
});

describe("parseNumeric — 'girilmedi' ile 'sıfır' AYRIDIR", () => {
  it("boş metin null, '0' sıfırdır", () => {
    expect(parseNumeric("")).toBeNull();
    expect(parseNumeric("   ")).toBeNull();
    expect(parseNumeric("0")).toBe(0);
  });
});

describe("isBlankLine", () => {
  it("yeni açılan satır boştur (KDV varsayılanı onu doldurmaz)", () => {
    expect(isBlankLine(emptyLineDraft("x"))).toBe(true);
  });

  it("tek alanı dolu satır boş DEĞİLDİR", () => {
    expect(isBlankLine(draft({ description: "a" }))).toBe(false);
    expect(isBlankLine(draft({ quantity: "1" }))).toBe(false);
  });
});

describe("buildLines — gövde şeması", () => {
  it("dört satır sunucu şemasına çevrilir", () => {
    const result = buildLines(MOCKUP_LINES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toHaveLength(4);
    expect(result.lines[0]).toEqual({
      description: "Kat Döşemesi Betonu C25/30",
      unit: "m³",
      quantity: 1320,
      unit_price: 2113,
      vat_rate: 20,
    });
  });

  it("🔴 BEKÇİ: `line_total` ve `sort_order` GÖVDEYE GİRMEZ (sunucu 422 verir)", () => {
    const result = buildLines(MOCKUP_LINES);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const line of result.lines) {
      expect(Object.keys(line)).not.toContain("line_total");
      expect(Object.keys(line)).not.toContain("sort_order");
    }
  });

  it("TAMAMEN boş satır atlanır, kısmen dolu satır HATA verir", () => {
    const withBlank = buildLines([...MOCKUP_LINES, emptyLineDraft("bos")]);
    expect(withBlank.ok).toBe(true);
    if (withBlank.ok) expect(withBlank.lines).toHaveLength(4);

    const partial = buildLines([draft({ key: "1", description: "Beton" })]);
    expect(partial).toEqual({ ok: false, message: "1. kalemin miktarı sıfırdan büyük olmalıdır." });
  });

  it("🔴 BEKÇİ: açıklamasız / sıfır miktarlı / oran dışı KDV reddedilir", () => {
    expect(buildLines([draft({ quantity: "1", unitPrice: "1" })])).toEqual({
      ok: false,
      message: "1. kalemin açıklaması boş olamaz.",
    });
    expect(
      buildLines([draft({ description: "a", quantity: "0", unitPrice: "1" })]),
    ).toEqual({ ok: false, message: "1. kalemin miktarı sıfırdan büyük olmalıdır." });
    expect(
      buildLines([draft({ description: "a", quantity: "1", unitPrice: "1", vatRate: "120" })]),
    ).toEqual({ ok: false, message: "1. kalemin KDV oranı 0-100 aralığında olmalıdır." });
  });

  it("birim BOŞSA anahtar hiç gönderilmez (serbest metin, kapalı küme değil)", () => {
    const result = buildLines([draft({ description: "a", quantity: "1", unitPrice: "1", unit: "" })]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.lines[0] ?? {})).not.toContain("unit");
  });

  it("hata mesajı BOŞ satırları saymaz — satır numarası formdaki sıradır", () => {
    const result = buildLines([emptyLineDraft("a"), draft({ key: "b", description: "x" })]);
    expect(result).toEqual({ ok: false, message: "2. kalemin miktarı sıfırdan büyük olmalıdır." });
  });
});

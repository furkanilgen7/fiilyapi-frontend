import { describe, expect, it } from "vitest";

import {
  EMPTY_RATE_DRAFT,
  appendBracketDraft,
  bracketLowerBound,
  bracketsToDrafts,
  buildYearOptions,
  defaultYear,
  isYearLocked,
  rateDraftToBody,
  rateToDraft,
  removeBracketDraft,
  type PayrollPeriodListRow,
  type PayrollRateResponse,
  type PayrollTaxBracketResponse,
} from "./payroll-rate-admin";

function rate(over: Partial<PayrollRateResponse> = {}): PayrollRateResponse {
  return {
    id: "r1",
    year: 2026,
    personnel_source: "company",
    sgk_employee_pct: "14.000",
    unemployment_employee_pct: "1.000",
    income_tax_pct: null,
    stamp_tax_pct: "0.759",
    sgk_employer_pct: "20.500",
    unemployment_employer_pct: "2.000",
    short_work_pct: "0.000",
    is_active: true,
    ...over,
  };
}

function bracket(over: Partial<PayrollTaxBracketResponse>): PayrollTaxBracketResponse {
  return {
    id: `b${over.ordinal}`,
    year: 2026,
    income_kind: "wage",
    ordinal: 1,
    upper_bound: null,
    rate_pct: "15.000",
    is_active: true,
    ...over,
  };
}

function period(year: number, status: PayrollPeriodListRow["status"]): PayrollPeriodListRow {
  return {
    id: `p-${year}-${status}`,
    year,
    month: 1,
    status,
    payment_due_date: null,
    paid_at: null,
    personnel_count: 0,
    gross_total: "0.00",
    sgk_employer_total: "0.00",
    net_total: "0.00",
    total_cost: "0.00",
  } as PayrollPeriodListRow;
}

describe("buildYearOptions — 2027 BOŞKEN de seçilebilir olmalıdır", () => {
  it("veride olmayan GELECEK yılı da ekler (bu dilimin var oluş sebebi)", () => {
    expect(buildYearOptions([2025, 2026], 2026)).toEqual([2027, 2026, 2025]);
  });
  it("hiç veri yokken bile iki yıl sunar", () => {
    expect(buildYearOptions([], 2026)).toEqual([2027, 2026]);
  });
  it("sözleşme aralığının (2000-2100) dışını eler", () => {
    expect(buildYearOptions([1999, 2101, 2030], 2026)).toEqual([2030, 2027, 2026]);
  });
  it("azalan sıralar (en yeni başta) ve tekrarları eler", () => {
    expect(buildYearOptions([2026, 2026, 2024], 2026)).toEqual([2027, 2026, 2024]);
  });
});

describe("defaultYear", () => {
  it("veride EN YENİ yılı seçer (takvim yılı boşsa ekran boş açılmaz)", () => {
    expect(defaultYear([2024, 2025, 2026], 2030)).toBe(2026);
  });
  it("hiç veri yoksa takvim yılını seçer", () => {
    expect(defaultYear([], 2026)).toBe(2026);
  });
  it("gelecek yıla FIRLAMAZ (2099 verisi varsayılan olamaz)", () => {
    expect(defaultYear([2026, 2099], 2026)).toBe(2026);
  });
});

describe("isYearLocked — 409 ÖN kapısı", () => {
  it("`approved` dönem yılı kilitler", () => {
    expect(isYearLocked([period(2026, "approved")], 2026)).toBe(true);
  });
  it("`paid` dönem yılı kilitler", () => {
    expect(isYearLocked([period(2026, "paid")], 2026)).toBe(true);
  });
  it("`draft`/`pending_approval` KİLİTLEMEZ (kural bordroyu tıkamaz)", () => {
    expect(isYearLocked([period(2026, "draft"), period(2026, "pending_approval")], 2026)).toBe(
      false,
    );
  });
  it("BAŞKA yılın onaylı dönemi bu yılı kilitlemez", () => {
    expect(isYearLocked([period(2025, "paid")], 2026)).toBe(false);
  });
});

describe("rateToDraft / rateDraftToBody", () => {
  it("`income_tax_pct: null` boş kutuya, boş kutu `null`a döner (DİLİMLİ REJİM)", () => {
    const draft = rateToDraft(rate({ income_tax_pct: null }));
    expect(draft.income_tax_pct).toBe("");
    const body = rateDraftToBody(draft);
    expect(body.ok && body.body.income_tax_pct).toBeNull();
  });
  it("dolu gelir vergisi oranı DÜZ ORAN olarak gider", () => {
    const body = rateDraftToBody(rateToDraft(rate({ income_tax_pct: "20.000" })));
    expect(body.ok && body.body.income_tax_pct).toBe("20.000");
  });
  it("YEDİ alanın hepsi gövdededir (kısmi yama yok)", () => {
    const body = rateDraftToBody(rateToDraft(rate()));
    expect(body.ok).toBe(true);
    expect(body.ok && Object.keys(body.body).sort()).toEqual([
      "income_tax_pct",
      "is_active",
      "sgk_employee_pct",
      "sgk_employer_pct",
      "short_work_pct",
      "stamp_tax_pct",
      "unemployment_employee_pct",
      "unemployment_employer_pct",
    ]);
  });
  it("gelir vergisi DIŞINDA boş alan REDDEDİLİR (sessizce 0 olmaz)", () => {
    const sonuc = rateDraftToBody({ ...EMPTY_RATE_DRAFT, income_tax_pct: "" });
    expect(sonuc.ok).toBe(false);
    expect(sonuc.ok === false && sonuc.field).toBe("sgk_employee_pct");
  });
  it("`is_active` taslaktan gelir", () => {
    const body = rateDraftToBody({ ...rateToDraft(rate()), isActive: false });
    expect(body.ok && body.body.is_active).toBe(false);
  });
});

describe("dilim taslakları", () => {
  it("sunucudan gelen set `ordinal` sırasına dizilir, sınırsız son dilim boş kutudur", () => {
    const drafts = bracketsToDrafts([
      bracket({ ordinal: 2, upper_bound: null, rate_pct: "40.000" }),
      bracket({ ordinal: 1, upper_bound: "190000.00", rate_pct: "15.000" }),
    ]);
    expect(drafts.map((d) => [d.upperBound, d.ratePct])).toEqual([
      ["190000.00", "15.000"],
      ["", "40.000"],
    ]);
  });
  it("yeni dilim SONDAN BİR ÖNCEYE girer — son dilim sınırsız kalmalıdır", () => {
    const drafts = bracketsToDrafts([
      bracket({ ordinal: 1, upper_bound: "190000.00", rate_pct: "15.000" }),
      bracket({ ordinal: 2, upper_bound: null, rate_pct: "40.000" }),
    ]);
    const eklenmis = appendBracketDraft(drafts);
    expect(eklenmis).toHaveLength(3);
    expect(eklenmis[2]!.ratePct).toBe("40.000");
    expect(eklenmis[2]!.upperBound).toBe("");
    expect(eklenmis[1]!.ratePct).toBe("");
  });
  it("satır kimliğe göre silinir", () => {
    const drafts = bracketsToDrafts([bracket({ ordinal: 1 }), bracket({ ordinal: 2 })]);
    expect(removeBracketDraft(drafts, drafts[0]!.key)).toHaveLength(1);
  });
  it("satır anahtarları BENZERSİZDİR (React anahtarı olarak kullanılıyor)", () => {
    const a = bracketsToDrafts([bracket({ ordinal: 1 })]);
    const b = bracketsToDrafts([bracket({ ordinal: 1 })]);
    expect(a[0]!.key).not.toBe(b[0]!.key);
  });
});

describe("bracketLowerBound — alt sınır TÜREVDİR, gövdeye gitmez", () => {
  it("ilk dilimin alt sınırı 0'dır", () => {
    expect(bracketLowerBound(undefined)).toBe("0");
  });
  it("önceki üst sınır + 1 kuruş", () => {
    expect(bracketLowerBound("190000")).toBe("190000.01");
    expect(bracketLowerBound("190000.00")).toBe("190000.01");
    expect(bracketLowerBound("190000.99")).toBe("190001");
  });
  it("TR virgülünü kabul eder", () => {
    expect(bracketLowerBound("190000,50")).toBe("190000.51");
  });
  it("ayrıştırılamayan/boş sınır `null` verir (UYDURULMAZ)", () => {
    expect(bracketLowerBound("")).toBeNull();
    expect(bracketLowerBound("abc")).toBeNull();
  });
});

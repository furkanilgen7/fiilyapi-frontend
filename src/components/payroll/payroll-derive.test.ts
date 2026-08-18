import { describe, expect, it } from "vitest";

import type {
  PayrollLineResponse,
  PayrollPeriodListRow,
  PayrollSectionResponse,
  WorkerSource,
} from "@/lib/api/hooks/usePayroll";

import {
  amountFieldValue,
  defaultPeriodId,
  isAmountInputValid,
  isLineSplitEditable,
  lineSplitDisabledReason,
  orderedSections,
  periodNavigation,
  skipSummary,
  sortPeriodsChronologically,
  toAmountPayload,
  totalLineCount,
  visibleSections,
} from "./payroll-derive";
import {
  LINE_STATUS_LABELS,
  PERIOD_STATUS_LABELS,
  SOURCE_BADGE_LABELS,
  SOURCE_ORDER,
  SOURCE_SECTION_REGIME,
  SOURCE_SECTION_UNIT,
  SOURCE_TAB_LABELS,
} from "./payroll-labels";

function periodRow(
  id: string,
  year: number,
  month: number,
): PayrollPeriodListRow {
  return {
    id,
    year,
    month,
    status: "draft",
    payment_due_date: null,
    paid_at: null,
    personnel_count: 0,
    gross_total: "0",
    sgk_employer_total: "0",
    net_total: "0",
    total_cost: "0",
  };
}

function line(overrides: Partial<PayrollLineResponse> = {}): PayrollLineResponse {
  return {
    id: "line-1",
    personnel_id: "p-1",
    personnel_name: "Ayşe Demir",
    personnel_source: "company",
    days: 21,
    gross_amount: "37800.00",
    deduction_amount: "11262.00",
    net_amount: "26538.00",
    bank_amount: "26538.00",
    cash_amount: "0.00",
    status: "pending",
    excluded_reason: null,
    is_overridden: false,
    overridden_at: null,
    previous_gross_amount: null,
    tax_base_amount: null,
    cumulative_tax_base: null,
    income_tax_amount: null,
    ...overrides,
  };
}

function section(
  source: WorkerSource,
  lineCount: number,
): PayrollSectionResponse {
  return { personnel_source: source, line_count: lineCount, lines: [] };
}

describe("dönem gezgini", () => {
  const rows = [periodRow("b", 2026, 7), periodRow("a", 2026, 6), periodRow("c", 2026, 8)];

  it("dönemleri kronolojik sıralar ve girdiyi mutasyona uğratmaz", () => {
    const sorted = sortPeriodsChronologically(rows);
    expect(sorted.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(rows.map((row) => row.id)).toEqual(["b", "a", "c"]);
  });

  it("yıl sınırını doğru aşar (Aralık → Ocak)", () => {
    const across = [periodRow("jan", 2027, 1), periodRow("dec", 2026, 12)];
    expect(sortPeriodsChronologically(across).map((row) => row.id)).toEqual(["dec", "jan"]);
  });

  it("varsayılan dönem EN YENİ dönemdir", () => {
    expect(defaultPeriodId(rows)).toBe("c");
  });

  it("dönem yoksa varsayılan undefined döner", () => {
    expect(defaultPeriodId([])).toBeUndefined();
  });

  it("komşu dönemleri kronolojik dizide bulur", () => {
    const nav = periodNavigation(rows, "b");
    expect(nav.previousId).toBe("a");
    expect(nav.nextId).toBe("c");
    expect(nav.current?.month).toBe(7);
  });

  it("uçlarda komşu yoktur (düğme devre dışı kalır)", () => {
    expect(periodNavigation(rows, "a").previousId).toBeUndefined();
    expect(periodNavigation(rows, "c").nextId).toBeUndefined();
  });

  it("bilinmeyen kimlik için gezinme boş döner", () => {
    expect(periodNavigation(rows, "yok")).toEqual({
      previousId: undefined,
      nextId: undefined,
      current: undefined,
    });
  });
});

describe("bölümler", () => {
  it("bölümleri mockup sırasına (BY:124/172/240/268) dizer", () => {
    const sections = [section("intern", 2), section("subcontractor", 29), section("company", 12)];
    expect(orderedSections(sections).map((s) => s.personnel_source)).toEqual([
      "company",
      "subcontractor",
      "intern",
    ]);
  });

  it("mockup'ta olmayan `general` bölümü DÜŞÜRÜLMEZ", () => {
    const sections = [section("general", 4), section("company", 12)];
    const ordered = orderedSections(sections);
    expect(ordered.map((s) => s.personnel_source)).toEqual(["company", "general"]);
  });

  it("toplam satır sayısı `line_count` toplamıdır", () => {
    expect(totalLineCount([section("company", 12), section("subcontractor", 29)])).toBe(41);
  });

  it("sekme süzgeci yalnız seçilen kaynağı bırakır", () => {
    const sections = [section("company", 12), section("subcontractor", 29)];
    expect(visibleSections(sections, "subcontractor").map((s) => s.personnel_source)).toEqual([
      "subcontractor",
    ]);
    expect(visibleSections(sections, null)).toHaveLength(2);
  });
});

describe("satır düzenlenebilirliği", () => {
  it("bekleyen satır düzenlenebilir ve gerekçesi yoktur", () => {
    const row = line();
    expect(isLineSplitEditable(row)).toBe(true);
    expect(lineSplitDisabledReason(row)).toBeUndefined();
  });

  it("🔴 taşeron (excluded) satırı düzenlenemez ve gerekçe SUNUCUNUN metnidir", () => {
    const row = line({
      status: "excluded",
      excluded_reason: "Taşeron hakedişinden ödenir (Akın İnşaat)",
    });
    expect(isLineSplitEditable(row)).toBe(false);
    expect(lineSplitDisabledReason(row)).toBe("Taşeron hakedişinden ödenir (Akın İnşaat)");
  });

  it("excluded satırda sunucu gerekçesi yoksa satır tipinden türeyen metin basılır", () => {
    const reason = lineSplitDisabledReason(line({ status: "excluded", excluded_reason: null }));
    expect(reason).toContain("taşeron hakedişi");
  });

  it("ödenmiş ve hesaplanamamış satırlar düzenlenemez", () => {
    expect(isLineSplitEditable(line({ status: "paid" }))).toBe(false);
    expect(
      isLineSplitEditable(line({ status: "uncomputed", net_amount: null })),
    ).toBe(false);
    expect(lineSplitDisabledReason(line({ status: "paid" }))).toContain("ödendi");
  });

  it("net tutarı olmayan satır düzenlenemez (0 ile null ayrı)", () => {
    expect(isLineSplitEditable(line({ net_amount: null }))).toBe(false);
    expect(isLineSplitEditable(line({ net_amount: "0.00" }))).toBe(true);
  });
});

describe("tutar girdisi", () => {
  it("null para alanı boş kutuya düşer, sıfıra DEĞİL", () => {
    expect(amountFieldValue(null)).toBe("");
    expect(amountFieldValue("0.00")).toBe("0.00");
  });

  it("boş girdi 0 olarak gönderilir (null bölüşümü silerdi)", () => {
    expect(toAmountPayload("")).toBe("0");
    expect(toAmountPayload("   ")).toBe("0");
  });

  it("virgüllü ondalık noktaya çevrilir", () => {
    expect(toAmountPayload("1234,50")).toBe("1234.50");
  });

  it("geçersiz girdi (harf/negatif/iki ayraç) reddedilir", () => {
    expect(isAmountInputValid("12,5")).toBe(true);
    expect(isAmountInputValid("")).toBe(true);
    expect(isAmountInputValid("-5")).toBe(false);
    expect(isAmountInputValid("1.2.3")).toBe(false);
    expect(isAmountInputValid("abc")).toBe(false);
  });
});

describe("atlama sayaçları (K7)", () => {
  it("hiç atlama yoksa yalnız yapılan iş yazılır", () => {
    expect(skipSummary("Onaylanan satır", 12, [{ label: "atlanan", count: 0 }])).toBe(
      "Onaylanan satır: 12.",
    );
  });

  it("🔴 sıfırdan büyük HER sayaç görünür (sessiz atlama yok)", () => {
    const text = skipSummary("Onaylanan satır", 12, [
      { label: "hesaplanamadığı için atlanan", count: 2 },
      { label: "taşeron olduğu için atlanan", count: 29 },
      { label: "zaten onaylı", count: 0 },
    ]);
    expect(text).toContain("2 hesaplanamadığı için atlanan");
    expect(text).toContain("29 taşeron olduğu için atlanan");
    expect(text).not.toContain("zaten onaylı");
  });
});

describe("etiket tamlığı", () => {
  it("BEŞ `PayrollLineStatus` değerinin hepsi AYRI etiketlidir (K3)", () => {
    const labels = Object.values(LINE_STATUS_LABELS);
    expect(labels).toHaveLength(5);
    expect(new Set(labels).size).toBe(5);
    expect(LINE_STATUS_LABELS.excluded).not.toBe(LINE_STATUS_LABELS.pending);
  });

  it("DÖRT `PayrollPeriodStatus` değerinin hepsi etiketlidir (K3)", () => {
    expect(Object.keys(PERIOD_STATUS_LABELS)).toEqual([
      "draft",
      "pending_approval",
      "approved",
      "paid",
    ]);
  });

  it("BEŞ `WorkerSource` üyesinin hepsi her haritada karşılanır", () => {
    const sources: WorkerSource[] = [
      "company",
      "subcontractor",
      "general",
      "freelance",
      "intern",
    ];
    for (const source of sources) {
      expect(SOURCE_TAB_LABELS[source]).toBeTruthy();
      expect(SOURCE_BADGE_LABELS[source]).toBeTruthy();
      expect(SOURCE_SECTION_REGIME[source]).toBeTruthy();
      expect(SOURCE_SECTION_UNIT[source]).toBeTruthy();
      expect(SOURCE_ORDER).toContain(source);
    }
    expect(SOURCE_ORDER).toHaveLength(sources.length);
  });

  it("🔴 K5 — kolon başlıklarında glif kapsamı dışı emoji YOKTUR", () => {
    const emojiRange = /[\u{1F300}-\u{1FAFF}]/u;
    for (const label of Object.values(SOURCE_TAB_LABELS)) {
      expect(emojiRange.test(label)).toBe(false);
    }
  });
});

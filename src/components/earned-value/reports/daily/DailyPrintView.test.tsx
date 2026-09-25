import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DAILY_REPORT_FIXTURE_DRAFT } from "./daily-fixtures";
import { DailyPrintView } from "./DailyPrintView";

/**
 * PLN-F3.4-düzeltme (lider eki 4) · Ondalık kanonu — `footer.undistributed_day`/
 * `unallocated_day` (backend Decimal → string) `Number(x) > 0` YERİNE
 * `compareDecimalStrings(x, "0") > 0` ile karşılaştırılır (CEO bulgusu,
 * QURR'da da çıktı; `lib/earned-value/decimal-input.ts` başlığındaki
 * `0.945 * 100 === 94.49999999999999` kanonu). `.ev-print-reconciliation__warn`
 * sınıfı BUNU okur — "Σ harcanan… + dağıtılmamış…" özet satırı AYRI ve HER
 * ZAMAN basılır, "dağıtılmamış" sözcüğüyle sorgulamak o satırla ÇAKIŞIR, bu
 * yüzden burada sınıf sorgusu kullanılır.
 */
describe("DailyPrintView — mutabakat uyarı satırı ondalık kanonu (GİR:371-379)", () => {
  it("undistributed_day > 0 iken uyarı satırı basılır ve değeri taşır", () => {
    const report = {
      ...DAILY_REPORT_FIXTURE_DRAFT,
      draft_diary_dates: [],
      unrated_entries: [],
      footer: { ...DAILY_REPORT_FIXTURE_DRAFT.footer!, undistributed_day: "16" },
    };
    const { container } = render(<DailyPrintView report={report} eyebrow="FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi" />);
    const warn = container.querySelector(".ev-print-reconciliation__warn");
    expect(warn).not.toBeNull();
    expect(warn?.textContent).toContain("16 a-s dağıtılmamış");
  });

  it("undistributed_day tam 0 iken (ve taslak/oransız girdi de yoksa) uyarı satırı basılmaz", () => {
    const report = {
      ...DAILY_REPORT_FIXTURE_DRAFT,
      draft_diary_dates: [],
      unrated_entries: [],
      footer: { ...DAILY_REPORT_FIXTURE_DRAFT.footer!, undistributed_day: "0" },
    };
    const { container } = render(<DailyPrintView report={report} eyebrow="FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi" />);
    expect(container.querySelector(".ev-print-reconciliation__warn")).toBeNull();
  });

  it("undistributed_day '0.00' (sıfıra kanonik eşit, farklı yazım) iken de uyarı satırı basılmaz", () => {
    const report = {
      ...DAILY_REPORT_FIXTURE_DRAFT,
      draft_diary_dates: [],
      unrated_entries: [],
      footer: { ...DAILY_REPORT_FIXTURE_DRAFT.footer!, undistributed_day: "0.00" },
    };
    const { container } = render(<DailyPrintView report={report} eyebrow="FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi" />);
    expect(container.querySelector(".ev-print-reconciliation__warn")).toBeNull();
  });
});

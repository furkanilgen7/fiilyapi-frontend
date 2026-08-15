import { describe, expect, it } from "vitest";

import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";

import {
  ACCOUNT_TYPE_OPTIONS,
  CHART_ACCOUNT_CODE_PATTERN,
  CHART_ACCOUNT_FORM_BLOCKERS,
  chartAccountFormBlockers,
  chartAccountFormOf,
  changedChartAccountFields,
  emptyChartAccountForm,
  type ChartAccountFormState,
} from "./chart-account-form";

const ACCOUNT: ChartAccountResponse = {
  id: "acc-100",
  code: "100",
  name: "Kasa",
  account_type: "asset",
  is_active: true,
  balance: "284800.00",
  class_code: "1",
  level: 2,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

function form(overrides: Partial<ChartAccountFormState> = {}): ChartAccountFormState {
  return { code: "100", name: "Kasa", accountType: "asset", isActive: true, ...overrides };
}

describe("kod dilbilgisi — backend `codes.ACCOUNT_CODE_PATTERN` ile BIREBIR", () => {
  it("kapali bicim kumesini kabul eder: NN · NNN · NNN.NN", () => {
    for (const code of ["10", "12", "100", "191", "120.01", "320.04", "999.99"]) {
      expect(CHART_ACCOUNT_CODE_PATTERN.test(code), code).toBe(true);
    }
  });

  it("kume disini reddeder (ilk hane 0 · tek hane · UCUNCU kirilim · harf)", () => {
    for (const code of ["0", "1", "01", "012", "1000", "120.1", "120.001", "120.01.001", "12A", "12 "]) {
      expect(CHART_ACCOUNT_CODE_PATTERN.test(code), code).toBe(false);
    }
  });
});

describe("chartAccountFormBlockers — kaydet kapisi", () => {
  it("gecerli formda engel YOKTUR", () => {
    expect(chartAccountFormBlockers(form())).toEqual([]);
  });

  it("bos kod ve bos ad kapiyi kapatir", () => {
    expect(chartAccountFormBlockers(form({ code: "  " }))).toContain(
      CHART_ACCOUNT_FORM_BLOCKERS.code,
    );
    expect(chartAccountFormBlockers(form({ name: "" }))).toContain(
      CHART_ACCOUNT_FORM_BLOCKERS.name,
    );
  });

  /** 🔴 MUTASYON KANITI: tek karakter (`1000`) kapiyi KAPATIR. */
  it("bicimi bozuk kod BICIM engeli uretir (bos kod engeli DEGIL)", () => {
    const blockers = chartAccountFormBlockers(form({ code: "1000" }));
    expect(blockers).toEqual([CHART_ACCOUNT_FORM_BLOCKERS.codeFormat]);
  });

  it("bastaki/sondaki bosluk kirmizi yapmaz (kirpilarak denetlenir)", () => {
    expect(chartAccountFormBlockers(form({ code: " 120.01 " }))).toEqual([]);
  });
});

describe("changedChartAccountFields — yalniz DEGISEN alanlar", () => {
  it("hicbir sey degismediyse govde BOSTUR (kod kilidi bos yere riske atilmaz)", () => {
    expect(changedChartAccountFields(chartAccountFormOf(ACCOUNT), ACCOUNT)).toEqual({});
  });

  it("yalniz oynayan alani tasir", () => {
    expect(changedChartAccountFields(form({ name: "Merkez Kasa" }), ACCOUNT)).toEqual({
      name: "Merkez Kasa",
    });
    expect(changedChartAccountFields(form({ isActive: false }), ACCOUNT)).toEqual({
      is_active: false,
    });
    expect(changedChartAccountFields(form({ accountType: "expense" }), ACCOUNT)).toEqual({
      account_type: "expense",
    });
  });

  /**
   * 🔴 TUREV ALAN GOVDEYE SIZMAZ: `balance`/`class_code`/`level` sunucuda
   * `extra="forbid"` yuzunden 422 uretir. Govde anahtarlari dort alanla sinirli.
   */
  it("turev alanlar (balance/class_code/level) govdeye HIC girmez", () => {
    const body = changedChartAccountFields(
      form({ code: "101", name: "Yeni", accountType: "expense", isActive: false }),
      ACCOUNT,
    );
    expect(Object.keys(body).sort()).toEqual(["account_type", "code", "is_active", "name"]);
    for (const derived of ["balance", "class_code", "level", "id", "created_at", "updated_at"]) {
      expect(body).not.toHaveProperty(derived);
    }
  });
});

describe("form baslangici", () => {
  it("yeni hesap sunucu varsayilaniyla (is_active=true) acilir", () => {
    expect(emptyChartAccountForm()).toEqual({
      code: "",
      name: "",
      accountType: "asset",
      isActive: true,
    });
  });

  it("Tur acilirinda DORT secenek vardir ve etiketleri HP kanonundandir", () => {
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "asset",
      "liability",
      "revenue",
      "expense",
    ]);
    expect(ACCOUNT_TYPE_OPTIONS.map((option) => option.label)).toEqual([
      "Aktif",
      "Pasif",
      "Gelir",
      "Gider",
    ]);
  });
});

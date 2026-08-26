import { describe, expect, it } from "vitest";

import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";
import type { TrialBalanceResponse, TrialBalanceRow } from "@/lib/api/hooks/useTrialBalance";

import { bankLedgerAccounts, ledgerClosingBalance } from "./bank-reconciliation";

function account(code: string, name: string): ChartAccountResponse {
  return {
    id: `id-${code}`,
    code,
    name,
    account_type: "asset",
    is_active: true,
    is_contra: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    balance: "0.00",
    class_code: code.slice(0, 1),
    level: code.includes(".") ? 2 : 1,
  };
}

function tb(rows: TrialBalanceRow[]): TrialBalanceResponse {
  return {
    year: 2026,
    month: 7,
    is_balanced: true,
    rows,
    totals: {
      opening_debit: "0.00",
      opening_credit: "0.00",
      period_debit: "0.00",
      period_credit: "0.00",
      closing_debit: "0.00",
      closing_credit: "0.00",
    },
  };
}

function row(over: Partial<TrialBalanceRow>): TrialBalanceRow {
  return {
    account_id: "acc-1",
    account_code: "102",
    account_name: "Bankalar",
    opening_debit: "0.00",
    opening_credit: "0.00",
    period_debit: "0.00",
    period_credit: "0.00",
    closing_debit: "0.00",
    closing_credit: "0.00",
    ...over,
  };
}

describe("bankLedgerAccounts — seçicinin KÜMESİ", () => {
  it("yalnız kodu 102 ile başlayan hesaplar döner", () => {
    const out = bankLedgerAccounts([
      account("100", "Kasa"),
      account("102", "Bankalar"),
      account("102.01", "Ziraat Bank"),
      account("120", "Alıcılar"),
    ]);
    expect(out.map((a) => a.code)).toEqual(["102", "102.01"]);
  });

  it("🔴 süzme KOD üzerindedir, AD üzerinde DEĞİL", () => {
    // Ad serbest metindir ve kullanıcı değiştirebilir; TDHP kodu sabittir.
    // Ada bakan bir süzgeç "Banka Kredileri" (300) hesabını içeri alırdı.
    const out = bankLedgerAccounts([
      account("300", "Banka Kredileri"),
      account("102", "Hesaplarım"),
    ]);
    expect(out.map((a) => a.code)).toEqual(["102"]);
  });

  it("hiç banka hesabı yoksa BOŞ küme döner (uydurulmaz)", () => {
    expect(bankLedgerAccounts([account("100", "Kasa")])).toEqual([]);
  });
});

describe("ledgerClosingBalance — BM:243 kapanış bakiyesi", () => {
  it("borç kapanışı POZİTİF döner", () => {
    const out = ledgerClosingBalance(
      tb([row({ account_id: "acc-1", closing_debit: "2840500.00" })]),
      "acc-1",
    );
    expect(Number(out)).toBe(2840500);
  });

  it("🔴 kredili hesabın ALACAK kapanışı NEGATİF döner, sıfıra kırpılmaz", () => {
    // Banka hesabı normalde borç bakiyesi verir; kredili çalışan bir hesap
    // alacak verebilir. Sıfıra kırpılsaydı ekran borcu VARLIK gibi gösterirdi.
    const out = ledgerClosingBalance(
      tb([row({ account_id: "acc-1", closing_credit: "150000.00" })]),
      "acc-1",
    );
    expect(Number(out)).toBe(-150000);
  });

  // 🔴 K-MKD3 — "satır yok" ile "değer 0" AYRI hâllerdir.
  it("hesap mizanda YOKSA `undefined` döner, `0` DEĞİL", () => {
    expect(ledgerClosingBalance(tb([]), "acc-1")).toBeUndefined();
  });

  it("hesap mizanda VAR ve tam kapanmışsa SIFIR döner, `undefined` DEĞİL", () => {
    const out = ledgerClosingBalance(tb([row({ account_id: "acc-1" })]), "acc-1");
    expect(out).toBeDefined();
    expect(Number(out)).toBe(0);
  });

  it("mizan henüz gelmediyse `undefined` döner", () => {
    expect(ledgerClosingBalance(undefined, "acc-1")).toBeUndefined();
  });

  it("başka bir hesabın satırı KARIŞMAZ", () => {
    const out = ledgerClosingBalance(
      tb([
        row({ account_id: "acc-other", closing_debit: "999.00" }),
        row({ account_id: "acc-1", closing_debit: "1.00" }),
      ]),
      "acc-1",
    );
    expect(Number(out)).toBe(1);
  });
});

import { describe, expect, it } from "vitest";

import type { TrialBalanceRow } from "@/lib/api/hooks/useTrialBalance";

import { accountBalanceRailRows } from "./accounting-pro";

function row(over: Partial<TrialBalanceRow>): TrialBalanceRow {
  return {
    account_id: "acc-1",
    account_code: "100",
    account_name: "Kasa",
    opening_debit: "0.00",
    opening_credit: "0.00",
    period_debit: "0.00",
    period_credit: "0.00",
    closing_debit: "0.00",
    closing_credit: "0.00",
    ...over,
  };
}

describe("accountBalanceRailRows — MP:167-208 sağ ray", () => {
  it("BORÇ kapanışlı hesap `debit` tarafında ve kendi tutarıyla döner", () => {
    const [out] = accountBalanceRailRows([
      row({ account_id: "a", account_code: "102", closing_debit: "3964700.00" }),
    ]);
    expect(out).toEqual({
      accountId: "a",
      code: "102",
      name: "Kasa",
      amount: "3964700.00",
      side: "debit",
    });
  });

  it("ALACAK kapanışlı hesap `credit` tarafındadır", () => {
    const [out] = accountBalanceRailRows([
      row({ account_code: "320", closing_credit: "2184000.00" }),
    ]);
    expect(out?.side).toBe("credit");
    expect(out?.amount).toBe("2184000.00");
  });

  // 🔴 K-MKD3 — bu dilimin EN KRİTİK saf iddiası.
  it("İKİ tarafı da sıfır olan hesap SATIRDAN DÜŞMEZ, `flat` olarak döner", () => {
    // `/trial-balance` `include_empty=false` ile hareketsizleri ZATEN eler.
    // Buraya gelen sıfır, "hesap hareket gördü ve TAM kapandı" demektir.
    // Satır düşürülseydi ya da `—` basılsaydı ekran hesabın HİÇ HAREKET
    // GÖRMEDİĞİNİ söylerdi — muhasebede bu doğrudan bir para hatasıdır.
    const out = accountBalanceRailRows([row({ account_code: "100" })]);
    expect(out).toHaveLength(1);
    expect(out[0]?.side).toBe("flat");
  });

  it("gerçek sıfırda sunucunun KENDİ dizesi korunur (`0.00` → `0.00`)", () => {
    const [out] = accountBalanceRailRows([
      row({ closing_debit: "0.00", closing_credit: "0.00" }),
    ]);
    expect(out?.amount).toBe("0.00");
  });

  it("`0` ve `0.0000` da sıfır sayılır (biçim farkı hâl değiştirmez)", () => {
    const out = accountBalanceRailRows([
      row({ account_id: "a", closing_debit: "0", closing_credit: "0" }),
      row({ account_id: "b", closing_debit: "0.0000", closing_credit: "0.0000" }),
    ]);
    expect(out.map((r) => r.side)).toEqual(["flat", "flat"]);
  });

  it("ALACAK tarafı BORÇ'tan ÖNCE bakılır (net şemada ikisi birden dolmaz)", () => {
    // Sunucu sözleşmeyi bozup ikisini birden doldurursa istemci SESSİZCE
    // ikisini toplamaz; deterministik olarak alacak tarafını gösterir.
    const [out] = accountBalanceRailRows([
      row({ closing_debit: "5.00", closing_credit: "7.00" }),
    ]);
    expect(out).toMatchObject({ side: "credit", amount: "7.00" });
  });

  it("boş mizan boş ray üretir (satır UYDURULMAZ)", () => {
    expect(accountBalanceRailRows([])).toEqual([]);
  });

  // 🔴 KARAR-2 · ONAYLI MOCKUP SAPMASI.
  it("hesap kodu DÖNÜŞTÜRÜLMEZ: alt hesap da ana hesap da AYNEN basılır", () => {
    // MP sağ rayı `320` çizer, gövdesini `320.04` ile. Ekran ne kırpar ne
    // genişletir — sunucu ne verirse o. Alt hesap açma işi MU-4'tedir.
    const out = accountBalanceRailRows([
      row({ account_id: "a", account_code: "320", closing_credit: "1.00" }),
      row({ account_id: "b", account_code: "320.04", closing_credit: "1.00" }),
    ]);
    expect(out.map((r) => r.code)).toEqual(["320", "320.04"]);
  });
});
